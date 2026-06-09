#!/usr/bin/env python3
"""
human_rl_gym.py — Play Renju against the NN while it trains live.

Each game you play is used as a training episode. Every --update-every games
a REINFORCE gradient step is applied, then the checkpoint is saved.

Usage:
    python3 human_rl_gym.py --checkpoint checkpoints/black_expert_v2.pt \\
                             --color black --update-every 4
"""

import argparse, sys, os
import numpy as np
import torch
import torch.nn as nn

from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    find_forced_move, get_candidate_moves,
)

# ── ANSI colours ───────────────────────────────────────────────────────────────
_R  = "\033[0m"
_B  = "\033[1m"
_DIM = "\033[2m"
_RED = "\033[31m"
_GRN = "\033[32m"
_YLW = "\033[33m"
_CYN = "\033[36m"

BLACK_STONE = _B + "●" + _R
WHITE_STONE = _B + "○" + _R
LAST_BLACK  = _B + _RED + "●" + _R
LAST_WHITE  = _B + _RED + "○" + _R
EMPTY_CELL  = _DIM + "·" + _R

COL_LABELS = "ABCDEFGHJKLMNOP"  # skip I (looks like 1)


# ── Board display ──────────────────────────────────────────────────────────────

def print_board(board, last_move=None):
    print()
    print("    " + "  ".join(COL_LABELS[:BOARD_SIZE]))
    for r in range(BOARD_SIZE):
        cells = []
        for c in range(BOARD_SIZE):
            v = board[r, c]
            highlight = (last_move == (r, c))
            if v == BLACK:
                cells.append(LAST_BLACK if highlight else BLACK_STONE)
            elif v == WHITE:
                cells.append(LAST_WHITE if highlight else WHITE_STONE)
            else:
                cells.append(EMPTY_CELL)
        print(f" {r+1:2d}  " + "  ".join(cells))
    print()


# ── Move parsing ───────────────────────────────────────────────────────────────

def parse_move(s, board):
    """Parse 'E7', '7E', 'e 7', etc. Returns (row, col) or None."""
    s = s.strip().upper().replace(",", " ")
    col_char, row_str = None, ""
    for ch in s:
        if ch in COL_LABELS:
            col_char = ch
        elif ch.isdigit():
            row_str += ch
    if col_char and row_str:
        col = COL_LABELS.index(col_char)
        row = int(row_str) - 1
        if 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE:
            if board[row, col] == EMPTY:
                return (row, col)
    return None


def coord_label(r, c):
    return f"{COL_LABELS[c]}{r+1}"


# ── NN move ────────────────────────────────────────────────────────────────────

def nn_move(model, board, is_black, temperature, device, tactical_penalty):
    """
    Forward pass → sample move.
    Returns (move, log_prob_tensor, value_tensor, missed_forced_bool).
    log_prob and value retain their computation graphs for backprop.
    """
    tensor = board_to_tensor(board, is_black)
    x = torch.tensor(tensor, dtype=torch.float32, device=device).unsqueeze(0)

    # eval mode: use running BN stats (correct for batch_size=1)
    # do NOT use torch.no_grad() — we need gradients for REINFORCE
    model.eval()
    logits, val = model(x)
    model.train()

    logits = logits[0]         # shape [225]
    value  = val[0, 0]         # scalar tensor, retains grad

    # Build valid mask restricted to candidate region
    candidates = get_candidate_moves(board, is_black)
    mask = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=device)
    for r, c in candidates:
        if board[r, c] == EMPTY:
            mask[r * BOARD_SIZE + c] = 0.0
    # Fallback: any empty cell
    if (mask == float('-inf')).all():
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if board[r, c] == EMPTY:
                    mask[r * BOARD_SIZE + c] = 0.0

    # Sample move using Categorical (preserves gradient through log_prob)
    temp = max(temperature, 1e-3)
    probs = torch.softmax((logits + mask) / temp, dim=0)
    dist  = torch.distributions.Categorical(probs)
    idx   = dist.sample()
    lp    = dist.log_prob(idx)
    move  = (idx.item() // BOARD_SIZE, idx.item() % BOARD_SIZE)

    # Tactical check: did we miss a forced move?
    missed_forced = False
    if tactical_penalty > 0:
        forced = find_forced_move(board, is_black, candidates)
        if forced is not None and forced != move:
            missed_forced = True

    return move, lp, value, missed_forced


# ── REINFORCE loss ─────────────────────────────────────────────────────────────

def reinforce_loss(lps, vals, rewards, base_outcomes, entropy_coef, device):
    """
    lps           – list of log_prob tensors (one per NN move across all games)
    vals          – list of value scalar tensors
    rewards       – effective reward per move (game_outcome + step_reward)
    base_outcomes – raw game outcome per move (for value MSE)
    """
    if not lps:
        return None
    r_t  = torch.tensor(rewards,       dtype=torch.float32, device=device)
    bo_t = torch.tensor(base_outcomes, dtype=torch.float32, device=device)
    v_t  = torch.stack(vals)
    lp_t = torch.stack(lps)
    rn   = (r_t - r_t.mean()) / (r_t.std() + 1e-8) if r_t.std() > 1e-6 else r_t
    policy_loss = -(lp_t * (rn - v_t.detach())).mean()
    value_loss  = nn.functional.mse_loss(v_t, bo_t)
    entropy_bonus = -entropy_coef * lp_t.mean()
    return policy_loss + value_loss + entropy_bonus


# ── Single game ────────────────────────────────────────────────────────────────

def play_game(model, human_color, temperature, device, tactical_penalty, args):
    """
    Play one full game: human vs NN.
    human_color: BLACK or WHITE
    Returns: (outcome_for_nn, trajectory)
      trajectory: list of (log_prob, value_tensor, step_reward, base_outcome)
    """
    board       = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK  # Black opens at center
    is_black_turn = True
    trajectory  = []
    last_move   = (BOARD_SIZE // 2, BOARD_SIZE // 2)
    nn_color    = WHITE if human_color == BLACK else BLACK
    move_num    = 1  # center already placed

    print_board(board, last_move)

    while True:
        current_color = BLACK if is_black_turn else WHITE
        is_nn_turn    = (current_color == nn_color)

        if is_nn_turn:
            # ── NN move ──────────────────────────────────────────────────────
            move, lp, val, missed = nn_move(
                model, board, is_black_turn, temperature, device, tactical_penalty
            )
            # val is already a scalar tensor with grad; store directly
            step_reward = -tactical_penalty if missed else 0.0
            trajectory.append([lp, val, step_reward, None])  # base_outcome filled later

            board[move[0], move[1]] = current_color
            last_move = move
            hint = _YLW + " [missed forced move!]" + _R if missed else ""
            print(f"\n  NN ({_B}{'●' if is_nn_turn == (nn_color==BLACK) else '○'}{_R}) plays "
                  f"{_CYN}{coord_label(*move)}{_R}{hint}")
            print_board(board, last_move)
        else:
            # ── Human move ───────────────────────────────────────────────────
            human_stone = "●" if human_color == BLACK else "○"
            while True:
                try:
                    raw = input(f"  You ({_B}{human_stone}{_R}) — enter move (e.g. H8): ").strip()
                except (EOFError, KeyboardInterrupt):
                    print("\n\nInterrupted — saving checkpoint and exiting.")
                    return None, None
                if raw.lower() in ('q', 'quit', 'exit'):
                    return None, None
                if raw.lower() == 'board':
                    print_board(board, last_move)
                    continue
                move = parse_move(raw, board)
                if move is None:
                    print(f"  {_RED}Invalid move or cell occupied. Try again.{_R}")
                    continue
                break
            board[move[0], move[1]] = current_color
            last_move = move

        move_num += 1

        # Check win
        winner = check_five(board, move[0], move[1], current_color)
        if winner:
            print_board(board, last_move)
            if current_color == nn_color:
                print(f"\n  {_GRN}NN wins!{_R}")
                nn_outcome = 1.0
            else:
                print(f"\n  {_RED}You win!{_R}")
                nn_outcome = -1.0
            break

        # Draw (board full)
        if move_num >= BOARD_SIZE * BOARD_SIZE:
            print_board(board, last_move)
            print(f"\n  Draw.")
            nn_outcome = 0.0
            break

        is_black_turn = not is_black_turn

    # Back-fill base_outcome for all NN moves
    for t in trajectory:
        t[3] = nn_outcome
    trajectory = [(lp, val_t, step_r, base_o) for lp, val_t, step_r, base_o in trajectory]
    return nn_outcome, trajectory


# ── Training update ────────────────────────────────────────────────────────────

def run_update(model, optimizer, buffer, entropy_coef, device):
    """Run one REINFORCE update over all trajectories in the buffer."""
    lps, vals, rewards, base_outcomes = [], [], [], []
    for traj in buffer:
        for lp, val_t, step_r, base_o in traj:
            lps.append(lp)
            vals.append(val_t)
            rewards.append(base_o + step_r)
            base_outcomes.append(base_o)

    loss = reinforce_loss(lps, vals, rewards, base_outcomes, entropy_coef, device)
    if loss is not None:
        optimizer.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        return loss.item()
    return 0.0


# ── Checkpoint helpers ─────────────────────────────────────────────────────────

def save_checkpoint(model, optimizer, update_count, out_path, stats):
    payload = {
        'update':              update_count,
        'model_state_dict':    model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'human_gym_stats':     stats,
    }
    torch.save(payload, out_path)


# ── Main ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Interactive human RL gym for Renju")
    p.add_argument('--checkpoint',    type=str,   default='checkpoints/black_expert_v2.pt',
                   help='Model checkpoint to load and fine-tune')
    p.add_argument('--out',           type=str,   default=None,
                   help='Output checkpoint path (defaults to overwriting --checkpoint)')
    p.add_argument('--color',         type=str,   default='black',
                   choices=['black', 'white', 'alternate'],
                   help='Color the NN plays: black | white | alternate each game')
    p.add_argument('--update-every',  type=int,   default=4,
                   help='Run a gradient update after this many games')
    p.add_argument('--lr',            type=float, default=1e-5)
    p.add_argument('--temperature',   type=float, default=0.5,
                   help='NN move temperature (0 = greedy, higher = more exploratory)')
    p.add_argument('--tactical-penalty', type=float, default=0.5,
                   help='Extra reward penalty when NN misses a forced move')
    p.add_argument('--entropy-coef',  type=float, default=0.01)
    p.add_argument('--no-train',      action='store_true',
                   help='Play without training (evaluation / fun mode)')
    p.add_argument('--blocks',        type=int,   default=6)
    p.add_argument('--channels',      type=int,   default=64)
    return p.parse_args()


def main():
    args  = parse_args()
    out   = args.out or args.checkpoint
    device = (
        torch.device('mps')  if torch.backends.mps.is_available() else
        torch.device('cuda') if torch.cuda.is_available() else
        torch.device('cpu')
    )

    # ── Load model ────────────────────────────────────────────────────────────
    model = RenjuNet(num_blocks=args.blocks, channels=args.channels).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    update_count = 0
    stats = {'wins': 0, 'losses': 0, 'draws': 0, 'updates': 0}

    if os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        if not args.no_train and 'optimizer_state_dict' in ckpt:
            try:
                optimizer.load_state_dict(ckpt['optimizer_state_dict'])
            except Exception:
                pass
        if 'human_gym_stats' in ckpt:
            stats = ckpt['human_gym_stats']
            update_count = ckpt.get('update', 0)
        print(f"  Loaded: {args.checkpoint}")
    else:
        print(f"  {_RED}Checkpoint not found: {args.checkpoint}{_R}")
        sys.exit(1)

    mode_str = "evaluate" if args.no_train else f"train (update every {args.update_every} games)"
    print(f"\n  {_B}Renju Human RL Gym{_R}  —  NN plays {_CYN}{args.color}{_R}  |  mode: {mode_str}")
    print(f"  Board: {BOARD_SIZE}×{BOARD_SIZE}  |  Device: {device}")
    print(f"  Commands: enter move as col+row (e.g. H8), 'board' to redraw, 'q' to quit\n")

    buffer     = []
    game_count = 0
    nn_color_fixed = BLACK if args.color == 'black' else (WHITE if args.color == 'white' else None)

    while True:
        # Determine NN color this game
        if nn_color_fixed is not None:
            nn_color = nn_color_fixed
        else:
            nn_color = BLACK if game_count % 2 == 0 else WHITE

        human_color = WHITE if nn_color == BLACK else BLACK
        nn_str    = "●" if nn_color  == BLACK else "○"
        you_str   = "●" if human_color == BLACK else "○"
        print(f"\n  {_B}Game {game_count + 1}{_R}  |  "
              f"You: {_B}{you_str}{_R}  NN: {_B}{nn_str}{_R}  |  "
              f"Record W{stats['wins']}/L{stats['losses']}/D{stats['draws']}  "
              f"Updates: {stats['updates']}")
        print(f"  {_DIM}(Black always opens at H8 — center){_R}")

        outcome, traj = play_game(
            model, human_color, args.temperature, device, args.tactical_penalty, args
        )

        if outcome is None:  # quit signal
            break

        game_count += 1

        # Update stats (outcome is from NN perspective)
        if outcome > 0:
            stats['wins'] += 1
        elif outcome < 0:
            stats['losses'] += 1
        else:
            stats['draws'] += 1

        if not args.no_train and traj:
            buffer.append(traj)

            if len(buffer) >= args.update_every:
                loss_val = run_update(model, optimizer, buffer, args.entropy_coef, device)
                update_count   += 1
                stats['updates'] = update_count
                buffer.clear()
                save_checkpoint(model, optimizer, update_count, out, stats)
                total = stats['wins'] + stats['losses'] + stats['draws']
                wr = stats['wins'] / max(total, 1)
                print(f"\n  {_GRN}↑ Update {update_count} applied{_R}  |  "
                      f"loss={loss_val:.4f}  |  "
                      f"NN win rate: {wr:.0%} ({stats['wins']}/{total})  |  "
                      f"Saved → {out}")

        # Prompt to continue
        try:
            again = input(f"\n  Play another game? [Y/n]: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            break
        if again in ('n', 'no', 'q', 'quit'):
            break

    # Save on exit even if buffer not full
    if not args.no_train:
        if buffer:
            loss_val = run_update(model, optimizer, buffer, args.entropy_coef, device)
            update_count += 1
            stats['updates'] = update_count
        save_checkpoint(model, optimizer, update_count, out, stats)
        total = stats['wins'] + stats['losses'] + stats['draws']
        wr = stats['wins'] / max(total, 1)
        print(f"\n  Final checkpoint saved → {out}")
        print(f"  Session: {game_count} games  |  NN win rate: {wr:.0%} ({stats['wins']}/{total})")
    print()


if __name__ == '__main__':
    main()
