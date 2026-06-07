"""
train_rl_vs_minimax.py
RL training: Neural network vs minimax with curriculum learning.

Algorithm: REINFORCE with baseline
  - Play N games per update, alternating NN color
  - Reward: +1 win / -1 loss
  - Policy loss: -log_prob(action) * (reward - baseline)
  - Value loss: MSE(value_estimate, reward)
  - Entropy bonus: keeps the policy exploratory

Curriculum: depth increases when win_rate > --promote-threshold over last --eval-window games.
Checkpointing: every --checkpoint-every updates a numbered step file is saved and a quick
eval is run against minimax at depths 1..eval-max-depth.  Resumes automatically from the
latest step checkpoint if one exists.

Usage:
    python train_rl_vs_minimax.py \\
        --checkpoint checkpoints/supervised.pt \\
        --out checkpoints/rl_vs_minimax.pt \\
        --updates 2000 --games-per-update 16 --checkpoint-every 50
"""

import argparse, os, random, sys, subprocess, shutil, signal
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
from tqdm import trange

from model import build_model

# Convert SIGTERM into SystemExit so the try/finally checkpoint logic runs
# even when the process is terminated externally (e.g. stop_bash / kill).
signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_best_move, get_candidate_moves,
)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint',        type=str,   default='checkpoints/supervised.pt')
    p.add_argument('--out',               type=str,   default='checkpoints/rl_vs_minimax.pt')
    p.add_argument('--updates',           type=int,   default=2000)
    p.add_argument('--games-per-update',  type=int,   default=16)
    p.add_argument('--batch-size',        type=int,   default=8,
                   help='Games per NN batch (8 is optimal for MPS; '
                        'games-per-update runs in ceil(N/batch) rounds)')
    p.add_argument('--start-depth',       type=int,   default=1,
                   help='Default starting depth for both curricula')
    p.add_argument('--start-black-depth', type=int,   default=None,
                   help='Starting depth for Black curriculum (overrides --start-depth)')
    p.add_argument('--start-white-depth', type=int,   default=None,
                   help='Starting depth for White curriculum (overrides --start-depth)')
    p.add_argument('--max-depth',         type=int,   default=8)
    p.add_argument('--promote-threshold', type=float, default=0.6)
    p.add_argument('--eval-window',       type=int,   default=50)
    p.add_argument('--checkpoint-every',  type=int,   default=50,
                   help='Save a numbered step checkpoint every N updates')
    p.add_argument('--eval-games',        type=int,   default=20,
                   help='Games per depth/color passed to evaluate.py subprocess')
    p.add_argument('--eval-max-depth',    type=int,   default=4,
                   help='Max minimax depth passed to evaluate.py subprocess')
    p.add_argument('--entropy-coef',      type=float, default=0.01)
    p.add_argument('--lr',                type=float, default=5e-5)
    p.add_argument('--temperature',       type=float, default=1.0)
    p.add_argument('--eval-temperature',  type=float, default=0.3)
    p.add_argument('--color',             type=str,   default=None,
                   choices=['black', 'white'],
                   help='Train as a single-color expert. '
                        '"black" = all games NN plays Black; '
                        '"white" = all games NN plays White. '
                        'Omit for the default dual-color training.')
    p.add_argument('--blocks',            type=int,   default=6)
    p.add_argument('--channels',          type=int,   default=64)
    p.add_argument('--seed',              type=int,   default=42)
    return p.parse_args()


# ── Batched episode runner ─────────────────────────────────────────────────────
# Runs N games simultaneously with batched NN inference.
# Minimax is sequential (no subprocess pool) — simpler, reliable, no zombies.

def play_episodes_batched(model, n_games, depth_vs_black, depth_vs_white,
                          temperature, device, color=None):
    """
    Play n_games simultaneously with batched NN inference.
    color: None = alternate Black/White per game (default dual training)
           'black' = NN always plays Black (black expert mode)
           'white' = NN always plays White (white expert mode)
    """
    boards        = [empty_board() for _ in range(n_games)]
    if color == 'black':
        nn_is_black = [True]  * n_games
    elif color == 'white':
        nn_is_black = [False] * n_games
    else:
        nn_is_black = [i % 2 == 0 for i in range(n_games)]
    is_black_turn = [False]         * n_games
    transitions   = [[]             for _ in range(n_games)]
    outcomes      = [None]          * n_games

    for b in boards:
        b[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK

    for _ in range(224):
        alive = [i for i in range(n_games) if outcomes[i] is None]
        if not alive:
            break

        nn_ids = [i for i in alive if is_black_turn[i] == nn_is_black[i]]
        mm_ids = [i for i in alive if is_black_turn[i] != nn_is_black[i]]

        # Batched NN inference — one GPU forward pass for all nn_ids
        nn_moves = {}
        if nn_ids:
            tensors = np.stack([board_to_tensor(boards[i], is_black_turn[i])
                                for i in nn_ids])
            t_batch = torch.from_numpy(tensors).to(device)
            logits_batch, values_batch = model(t_batch)
            for k, i in enumerate(nn_ids):
                logits = logits_batch[k]; value = values_batch[k, 0]
                cands = get_candidate_moves(boards[i], is_black_turn[i])
                if not cands:
                    outcomes[i] = 0; continue
                mask = torch.full((225,), float('-inf'), device=device)
                for r, c in cands:
                    mask[r * BOARD_SIZE + c] = 0.0
                probs = torch.softmax((logits + mask) / temperature, dim=0)
                dist = torch.distributions.Categorical(probs)
                idx = dist.sample(); lp = dist.log_prob(idx)
                transitions[i].append((lp, value))
                nn_moves[i] = (idx.item() // BOARD_SIZE, idx.item() % BOARD_SIZE)

        # Sequential minimax — no subprocess pool, no zombies
        mm_moves = {}
        for i in mm_ids:
            depth = depth_vs_black if nn_is_black[i] else depth_vs_white
            mm_moves[i] = get_best_move(boards[i], is_black_turn[i], depth)

        # Apply moves
        all_moves = {**nn_moves, **mm_moves}
        for i in alive:
            if outcomes[i] is not None: continue
            move = all_moves.get(i)
            if move is None:
                outcomes[i] = 0; continue
            r, c = move
            color = BLACK if is_black_turn[i] else WHITE
            if boards[i][r, c] != EMPTY:
                outcomes[i] = -1; continue
            boards[i][r, c] = color
            if check_five(boards[i], r, c, color):
                nn_color = BLACK if nn_is_black[i] else WHITE
                outcomes[i] = 1 if color == nn_color else -1
            is_black_turn[i] = not is_black_turn[i]

    return transitions, [o if o is not None else 0 for o in outcomes]


def run_eval(model, device, eval_games, eval_max_depth, temperature):
    pass  # eval runs as a separate subprocess (evaluate.py --pt ...)


def fmt_eval(results):
    pass  # eval runs as a separate subprocess


# ── Checkpoint helpers ─────────────────────────────────────────────────────────

def _step_path(out, step):
    stem, ext = os.path.splitext(out)
    return f'{stem}_step{step:05d}{ext}'


def save_ckpt(out, step, model, optimizer, depth, win_rate, eval_results, args):
    payload = dict(
        update=step, model_state_dict=model.state_dict(),
        optimizer_state_dict=optimizer.state_dict(),
        curriculum_depth=depth, win_rate=win_rate,
        eval_results=eval_results, args=vars(args),
    )
    path = _step_path(out, step)
    torch.save(payload, path)
    return path


def find_latest_step(out):
    d = os.path.dirname(out) or '.'
    base = os.path.basename(os.path.splitext(out)[0])
    ext  = os.path.splitext(out)[1]
    steps = sorted([
        f for f in os.listdir(d)
        if f.startswith(base + '_step') and f.endswith(ext)
    ])
    return os.path.join(d, steps[-1]) if steps else None


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    torch.manual_seed(args.seed); random.seed(args.seed); np.random.seed(args.seed)
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')

    model = build_model(args.blocks, args.channels).to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-5)

    start_update = 0
    black_depth  = args.start_black_depth if args.start_black_depth is not None else args.start_depth
    white_depth  = args.start_white_depth if args.start_white_depth is not None else args.start_depth
    best_eval_wr = 0.0

    latest = find_latest_step(args.out)

    # Also check args.out itself (saved after every update) — use whichever is further ahead
    if os.path.exists(args.out):
        try:
            probe = torch.load(args.out, map_location='cpu', weights_only=False)
            probe_step = probe.get('update', 0)
            if latest:
                current_step = torch.load(latest, map_location='cpu', weights_only=False).get('update', 0)
                if probe_step > current_step:
                    latest = args.out
            elif probe_step > 0:
                latest = args.out
        except Exception:
            pass

    if latest:
        ckpt = torch.load(latest, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        optimizer.load_state_dict(ckpt['optimizer_state_dict'])
        start_update = ckpt['update']
        # Restore depths from checkpoint unless explicitly overridden on command line
        if args.start_black_depth is None:
            black_depth = ckpt.get('black_depth', ckpt.get('curriculum_depth', black_depth))
        if args.start_white_depth is None:
            white_depth = ckpt.get('white_depth', white_depth)
        best_eval_wr = ckpt.get('win_rate', 0.0)
        print(f'Resumed from {latest}  (step {start_update}, black_depth={black_depth}, white_depth={white_depth})')
    elif os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'Loaded: {args.checkpoint}  (black_depth={black_depth}, white_depth={white_depth})')

    log_path = os.path.splitext(args.out)[0] + '_log.txt'
    with open(log_path, 'a') as f:
        f.write(f'\n=== Run from update {start_update} ===\n')

    print(f'Updates {start_update}→{args.updates}  '
          f'black_depth {black_depth}→{args.max_depth}  '
          f'white_depth {white_depth}→{args.max_depth}  '
          f'checkpoint every {args.checkpoint_every}\n')

    recent_black = deque(maxlen=args.eval_window)   # outcomes when NN plays Black
    recent_white = deque(maxlen=args.eval_window)   # outcomes when NN plays White
    pbar = trange(start_update, args.updates, desc='Updates',
                  initial=start_update, total=args.updates)

    def _save_exit_checkpoint(update, step_override=None):
        """Save a checkpoint unconditionally — called on any exit."""
        step = step_override if step_override is not None else update + 1
        step_file = save_ckpt(args.out, step, model, optimizer,
                              black_depth, bwr, {}, args)
        payload = torch.load(step_file, map_location='cpu', weights_only=False)
        payload['white_depth'] = white_depth
        payload['white_wr']    = wwr
        torch.save(payload, step_file)
        shutil.copy2(step_file, args.out)
        print(f'\n  ✓ Exit checkpoint saved → {step_file}')
        eval_cmd = [
            sys.executable, os.path.join(os.path.dirname(__file__) or '.', 'evaluate.py'),
            '--pt', step_file,
            '--games', str(args.eval_games),
            '--max-minimax-depth', str(args.eval_max_depth),
            '--temperature', '0.3',
            '--log', log_path,
        ]
        subprocess.Popen(eval_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f'  Eval launched → {log_path}')
        with open(log_path, 'a') as f:
            f.write(f'[exit step {step}] Bd={black_depth} Wd={white_depth} '
                    f'Bwr={bwr:.2f} Wwr={wwr:.2f} → eval launched\n')

    update = start_update  # track last completed update for exit checkpoint
    try:
      for update in pbar:
        model.train()
        wins = losses = draws = 0

        # Depth sampling: uniform over [1, curriculum_depth].
        # The curriculum advances the upper limit, but all depths from 1 to max
        # are always sampled with equal probability. This prevents forgetting of
        # skills at lower depths as the curriculum progresses.
        def sample_depth(curriculum_depth):
            return np.random.randint(1, curriculum_depth + 1)

        # Play all games in batches for optimal GPU utilisation
        all_transitions, all_outcomes = [], []
        remaining = args.games_per_update
        while remaining > 0:
            n = min(remaining, args.batch_size)
            bd_play = sample_depth(black_depth)
            wd_play = sample_depth(white_depth)
            t, o = play_episodes_batched(model, n, bd_play, wd_play,
                                         args.temperature, device,
                                         color=args.color)
            all_transitions.extend(t); all_outcomes.extend(o)
            remaining -= n

        # Split transitions by color and track separately
        black_lps, black_vals, black_rewards = [], [], []
        white_lps, white_vals, white_rewards = [], [], []

        for g_idx, (transitions, outcome) in enumerate(zip(all_transitions, all_outcomes)):
            # In expert mode all games are the same color; in dual mode alternate
            if args.color == 'black':
                nn_is_black_game = True
            elif args.color == 'white':
                nn_is_black_game = False
            else:
                nn_is_black_game = (g_idx % 2 == 0)

            if nn_is_black_game:
                recent_black.append(outcome)
                target = (black_lps, black_vals, black_rewards)
            else:
                recent_white.append(outcome)
                target = (white_lps, white_vals, white_rewards)
            if outcome == 1: wins += 1
            elif outcome == -1: losses += 1
            else: draws += 1
            for lp, ve in transitions:
                target[0].append(lp); target[1].append(ve); target[2].append(float(outcome))

        # Separate gradient updates per color — prevents Black wins from
        # swamping White's reward normalisation and drowning out White's signal.
        def reinforce_loss(lps, vals, rewards):
            if not lps: return None
            r_t  = torch.tensor(rewards, dtype=torch.float32, device=device)
            v_t  = torch.stack(vals)
            lp_t = torch.stack(lps)
            rn   = (r_t - r_t.mean()) / (r_t.std() + 1e-8) if r_t.std() > 1e-6 else r_t
            return (-(lp_t * (rn - v_t.detach())).mean()
                    + nn.functional.mse_loss(v_t, r_t)
                    - args.entropy_coef * lp_t.mean())

        black_loss = reinforce_loss(black_lps, black_vals, black_rewards)
        white_loss = reinforce_loss(white_lps, white_vals, white_rewards)

        if black_loss is not None or white_loss is not None:
            loss = sum(l for l in [black_loss, white_loss] if l is not None)
            optimizer.zero_grad(); loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

        bwr = sum(1 for o in recent_black if o == 1) / max(len(recent_black), 1)
        wwr = sum(1 for o in recent_white if o == 1) / max(len(recent_white), 1)

        # Independent curriculum promotion for each color
        promoted = []
        if (len(recent_black) >= args.eval_window
                and bwr >= args.promote_threshold
                and black_depth < args.max_depth):
            black_depth += 1; recent_black.clear()
            promoted.append(f'Black→d{black_depth}(wr={bwr:.0%})')
        if (len(recent_white) >= args.eval_window
                and wwr >= args.promote_threshold
                and white_depth < args.max_depth):
            white_depth += 1; recent_white.clear()
            promoted.append(f'White→d{white_depth}(wr={wwr:.0%})')
        if promoted:
            msg = '  '.join(promoted)
            print(f'\n  ↑ Promoted: {msg}')
            with open(log_path, 'a') as f: f.write(f'[{update+1}] ↑ {msg}\n')

        if args.color == 'black':
            pbar.set_postfix(depth=black_depth, W=wins, L=losses, wr=f'{bwr:.0%}')
        elif args.color == 'white':
            pbar.set_postfix(depth=white_depth, W=wins, L=losses, wr=f'{wwr:.0%}')
        else:
            pbar.set_postfix(Bd=black_depth, Wd=white_depth, W=wins, L=losses,
                             Bwr=f'{bwr:.0%}', Wwr=f'{wwr:.0%}')

        # Save "latest" checkpoint after EVERY update — fast overwrite, never loses progress.
        # This is the file resume picks up, so no training is wasted on any stop.
        step = update + 1
        latest_payload = {
            'update': step, 'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'black_depth': black_depth, 'white_depth': white_depth,
            'curriculum_depth': black_depth,
            'win_rate': bwr, 'white_wr': wwr, 'args': vars(args),
        }
        torch.save(latest_payload, args.out)

        # Periodic numbered checkpoint + background eval every N steps
        if step % args.checkpoint_every == 0 or step == args.updates:
            step_file = save_ckpt(args.out, step, model, optimizer,
                                  black_depth, bwr, {}, args)
            # Patch in white_depth too
            payload = torch.load(step_file, map_location='cpu', weights_only=False)
            payload['white_depth'] = white_depth; payload['white_wr'] = wwr
            torch.save(payload, step_file)
            shutil.copy2(step_file, args.out)   # always keep "latest best" up to date
            print(f'\n── Checkpoint @ step {step} → {step_file}')

            # Fire-and-forget eval subprocess — training resumes immediately
            eval_cmd = [
                sys.executable, os.path.join(os.path.dirname(__file__) or '.', 'evaluate.py'),
                '--pt', step_file,
                '--games', str(args.eval_games),
                '--max-minimax-depth', str(args.eval_max_depth),
                '--temperature', '0.3',
                '--log', log_path,
            ]
            subprocess.Popen(eval_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f'  Eval process launched (results → {log_path})')

            with open(log_path, 'a') as f:
                f.write(f'[step {step}] Bd={black_depth} Wd={white_depth} '
                        f'Bwr={bwr:.2f} Wwr={wwr:.2f} → eval launched\n')

    except (KeyboardInterrupt, SystemExit):
        print('\nInterrupted.')
    finally:
        # Always save on exit — whether finished, interrupted, or killed
        last_periodic = (update // args.checkpoint_every) * args.checkpoint_every
        if update + 1 > last_periodic:   # haven't saved this window yet
            _save_exit_checkpoint(update)

    print(f'\nDone. Best: {args.out}  Log: {log_path}')


if __name__ == '__main__':
    main()
