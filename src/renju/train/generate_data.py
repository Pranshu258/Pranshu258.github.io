"""
generate_data.py
Generates self-play training data using the minimax engine and saves it as .npz files.

Variation strategy
──────────────────
Each game independently draws Black's and White's search depths from [1, max-depth],
producing the full skill spectrum in one run.

Temperature sampling
────────────────────
Each move is sampled via softmax over quick-scores with --temperature, so every game
follows a unique trajectory even when depths repeat.  The policy training label for each
position is always the minimax best move (not the sampled move), keeping labels
high-quality while games remain diverse.

Deduplication
─────────────
Identical (board, move) pairs that appear across games are merged before saving.
Their outcomes are averaged into a soft value label that reflects the true expected
outcome from that state.

Usage:
    python generate_data.py --games 5000 --out data/games.npz --max-depth 5
"""

import argparse
import os
import numpy as np
from tqdm import tqdm
from multiprocessing import Pool, cpu_count
from game_engine import play_game, BLACK, WHITE


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--games',       type=int,   default=5000,
                   help='Number of games to generate')
    p.add_argument('--out',         type=str,   default='data/games.npz')
    p.add_argument('--max-depth',   type=int,   default=5,
                   help='Upper bound for per-game depth sampling. Each game '
                        'independently draws Black and White depths from '
                        '[1, max-depth], producing a mix of skill levels.')
    p.add_argument('--temperature', type=float, default=1.5,
                   help='Softmax temperature for move sampling (default 1.5). '
                        'Higher = more diverse game trajectories; 0 = pure '
                        'deterministic minimax. The policy training label is '
                        'always the minimax best move regardless of temperature.')
    p.add_argument('--workers',     type=int,   default=max(1, cpu_count() - 1),
                   help='Parallel worker processes (default: all CPUs minus 1)')
    p.add_argument('--checkpoint-every', type=int, default=200,
                   help='Save a resumable checkpoint every N completed games (default 200)')
    p.add_argument('--seed',        type=int,   default=42)
    return p.parse_args()


# ─── Worker function (runs in a subprocess) ───────────────────────────────────

def _run_game(args):
    """Generate one game. Called by multiprocessing workers."""
    bd, wd, temperature, seed = args
    np.random.seed(seed)
    return play_game(black_depth=bd, white_depth=wd, temperature=temperature)


# ─── Checkpoint helpers ───────────────────────────────────────────────────────

def _ckpt_path(out_path):
    base, ext = os.path.splitext(out_path)
    return base + '_checkpoint.npz'


def save_checkpoint(path, boards, moves, outcomes, games_done, black_wins, white_wins, draws):
    np.savez_compressed(
        path,
        boards=np.stack(boards).astype(np.float32) if boards else np.empty((0, 3, 15, 15), np.float32),
        moves=np.array(moves, dtype=np.int32),
        outcomes=np.array(outcomes, dtype=np.float32),
        meta=np.array([games_done, black_wins, white_wins, draws], dtype=np.int64),
    )


def load_checkpoint(path):
    ckpt = np.load(path, allow_pickle=False)
    boards   = list(ckpt['boards'])
    moves    = list(ckpt['moves'])
    outcomes = list(ckpt['outcomes'])
    games_done, black_wins, white_wins, draws = ckpt['meta'].tolist()
    return boards, moves, outcomes, int(games_done), int(black_wins), int(white_wins), int(draws)


# ─── Deduplication ────────────────────────────────────────────────────────────

def deduplicate(boards, moves, outcomes):
    """
    Remove duplicate (board, move) pairs, averaging outcomes for duplicates.
    """
    print('Deduplicating …', flush=True)

    key_to_indices = {}
    for i, (board, move) in enumerate(zip(boards, moves)):
        key = (board.tobytes(), int(move))
        key_to_indices.setdefault(key, []).append(i)

    n_before = len(boards)
    n_dupes  = sum(len(v) - 1 for v in key_to_indices.values())

    dedup_boards, dedup_moves, dedup_outcomes = [], [], []
    for key, indices in key_to_indices.items():
        dedup_boards.append(boards[indices[0]])
        dedup_moves.append(moves[indices[0]])
        dedup_outcomes.append(float(np.mean(outcomes[indices])))

    n_after = len(dedup_boards)
    print(f'  Before: {n_before:,}   Duplicates removed: {n_dupes:,}   After: {n_after:,} '
          f'({100 * n_dupes / max(n_before, 1):.1f}% reduction)')

    return (
        np.stack(dedup_boards).astype(np.float32),
        np.array(dedup_moves,    dtype=np.int32),
        np.array(dedup_outcomes, dtype=np.float32),
    )


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    rng = np.random.default_rng(args.seed)
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    # Deterministic task list (same seed → same depth/seed assignments always)
    depths = rng.integers(1, args.max_depth + 1, size=(args.games, 2))
    seeds  = rng.integers(0, 2**31, size=args.games)
    tasks  = [(int(bd), int(wd), args.temperature, int(s))
              for (bd, wd), s in zip(depths, seeds)]

    # Resume from checkpoint if one exists
    ckpt_path = _ckpt_path(args.out)
    all_boards, all_moves, all_outcomes = [], [], []
    black_wins = white_wins = draws = 0
    games_done = 0

    if os.path.exists(ckpt_path):
        all_boards, all_moves, all_outcomes, games_done, black_wins, white_wins, draws = \
            load_checkpoint(ckpt_path)
        print(f'Resuming from checkpoint: {games_done}/{args.games} games done, '
              f'{len(all_boards):,} positions accumulated')

    remaining = tasks[games_done:]
    if not remaining:
        print('All games already completed in checkpoint.')
    else:
        print(f'Generating {len(remaining)} remaining games using {args.workers} workers …')
        completed_since_ckpt = 0

        with Pool(processes=args.workers) as pool:
            for samples, winner in tqdm(
                pool.imap_unordered(_run_game, remaining, chunksize=8),
                total=len(remaining), desc='Games',
                initial=games_done
            ):
                if not samples:
                    draws += 1
                else:
                    for board, move_idx, outcome in samples:
                        all_boards.append(board)
                        all_moves.append(move_idx)
                        all_outcomes.append(outcome)
                    if winner == BLACK:   black_wins += 1
                    elif winner == WHITE: white_wins += 1
                    else:                 draws += 1

                games_done += 1
                completed_since_ckpt += 1

                if completed_since_ckpt >= args.checkpoint_every:
                    save_checkpoint(ckpt_path, all_boards, all_moves, all_outcomes,
                                    games_done, black_wins, white_wins, draws)
                    completed_since_ckpt = 0

        # Final checkpoint
        save_checkpoint(ckpt_path, all_boards, all_moves, all_outcomes,
                        games_done, black_wins, white_wins, draws)

    boards   = np.stack(all_boards).astype(np.float32)
    moves    = np.array(all_moves,    dtype=np.int32)
    outcomes = np.array(all_outcomes, dtype=np.float32)

    print(f'\nCollected {len(boards):,} raw positions from {args.games} games.')
    print(f'Black wins: {black_wins}  White wins: {white_wins}  Draws: {draws}')

    boards, moves, outcomes = deduplicate(boards, moves, outcomes)

    np.savez_compressed(args.out, boards=boards, moves=moves, outcomes=outcomes)
    print(f'Saved {len(boards):,} unique positions → {args.out}')

    # Remove checkpoint once final file is written
    if os.path.exists(ckpt_path):
        os.remove(ckpt_path)
        print(f'Checkpoint removed: {ckpt_path}')


if __name__ == '__main__':
    main()
