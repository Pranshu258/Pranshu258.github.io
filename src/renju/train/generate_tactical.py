"""
generate_tactical.py
Generate a supervised dataset of forced-move positions.

Two position types are collected:
  win   — current player has an unblocked 4-in-a-row; correct move completes 5.
  block — opponent has an unblocked 4-in-a-row; correct move prevents instant loss.

Output: data/tactical.npz  (boards, moves, outcomes) — same format as games.npz,
        directly usable by train_supervised.py --data data/tactical.npz.

Usage:
    python generate_tactical.py --positions 20000 --out data/tactical.npz
"""

import argparse, os
import numpy as np
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_candidate_moves, get_move_with_temperature, find_forced_move,
    move_to_index,
)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--positions', type=int,   default=20000,
                   help='Target number of tactical positions to collect')
    p.add_argument('--max-games', type=int,   default=500_000,
                   help='Safety cap on number of games to play')
    p.add_argument('--depth',     type=int,   default=3,
                   help='Minimax depth for self-play game generation')
    p.add_argument('--temperature', type=float, default=1.5,
                   help='Move temperature for self-play (higher = more variety)')
    p.add_argument('--out',       type=str,   default='data/tactical.npz')
    p.add_argument('--seed',      type=int,   default=0)
    return p.parse_args()


def _play_and_collect(depth, temperature, rng):
    """
    Play one minimax self-play game and return a list of
    (board_tensor, forced_move_idx, outcome, position_type) for every
    position that contained a forced move.

    outcome:
      +1 for win   positions (current player is about to win)
       0 for block positions (we block; game outcome uncertain, use 0)
    """
    board  = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK
    is_black_turn = False

    records = []
    move_history = [(BOARD_SIZE // 2, BOARD_SIZE // 2, BLACK)]

    for _ in range(223):
        color = BLACK if is_black_turn else WHITE
        candidates = get_candidate_moves(board, is_black_turn)
        if not candidates:
            break

        forced = find_forced_move(board, is_black_turn, candidates)

        if forced is not None:
            fr, fc = forced
            # Determine type: win vs block
            board[fr, fc] = color
            is_win = check_five(board, fr, fc, color)
            board[fr, fc] = EMPTY

            tensor  = board_to_tensor(board.copy(), is_black_turn)
            outcome = 1.0 if is_win else 0.0
            records.append((tensor, move_to_index(fr, fc), outcome))

        # Play the actual move (stochastic for variety)
        _, played = get_move_with_temperature(board, is_black_turn, depth, temperature)
        if played is None:
            break
        r, c = played
        board[r, c] = color
        move_history.append((r, c, color))

        if check_five(board, r, c, color):
            break
        is_black_turn = not is_black_turn

    return records


def main():
    args = parse_args()
    rng  = np.random.default_rng(args.seed)
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    boards_list   = []
    moves_list    = []
    outcomes_list = []

    win_count = block_count = games_played = 0

    print(f'Collecting {args.positions:,} tactical positions …')
    while len(boards_list) < args.positions and games_played < args.max_games:
        records = _play_and_collect(args.depth, args.temperature, rng)
        for tensor, move_idx, outcome in records:
            boards_list.append(tensor)
            moves_list.append(move_idx)
            outcomes_list.append(outcome)
            if outcome == 1.0:
                win_count += 1
            else:
                block_count += 1
        games_played += 1

        if games_played % 1000 == 0:
            print(f'  games={games_played:,}  positions={len(boards_list):,}'
                  f'  (win={win_count}, block={block_count})', flush=True)

    # Trim to requested count and shuffle
    total = len(boards_list)
    if total > args.positions:
        idx = rng.permutation(total)[:args.positions]
        boards_list   = [boards_list[i]   for i in idx]
        moves_list    = [moves_list[i]    for i in idx]
        outcomes_list = [outcomes_list[i] for i in idx]

    boards   = np.stack(boards_list).astype(np.float32)      # (N, 3, 15, 15)
    moves    = np.array(moves_list,    dtype=np.int64)       # (N,)
    outcomes = np.array(outcomes_list, dtype=np.float32)     # (N,)

    np.savez_compressed(args.out, boards=boards, moves=moves, outcomes=outcomes)
    print(f'\nSaved {len(boards):,} positions → {args.out}')
    print(f'  win positions  : {(outcomes == 1.0).sum():,}')
    print(f'  block positions: {(outcomes == 0.0).sum():,}')
    print(f'  games played   : {games_played:,}')


if __name__ == '__main__':
    main()
