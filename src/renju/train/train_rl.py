"""
train_rl.py
Phase 2: Reinforcement learning via MCTS self-play fine-tuning.

Two modes:
  Symmetric self-play (default): one model plays both colors against itself.
  Specialist mode (--opponent + --color): one model trains as a single color
    against a fixed opponent of the other color.  Only the specialist's moves
    are added to the replay buffer.

Usage:
    # Symmetric self-play
    python train_rl.py \\
        --checkpoint checkpoints/supervised.pt \\
        --iterations 30 --games-per-iter 200 --mcts-sims 50 \\
        --out checkpoints/rl_final.pt

    # Specialist — train Black against fixed White opponent
    python train_rl.py \\
        --checkpoint checkpoints/black_expert_v2.pt \\
        --opponent  checkpoints/white_expert_v2.pt \\
        --color black \\
        --iterations 10 --games-per-iter 50 --mcts-sims 25 \\
        --out checkpoints/self_play_black_v1.pt
"""

import argparse
import os
import math
import random
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from collections import deque
from tqdm import tqdm

from model import build_model, RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, on_board, check_five,
    get_candidate_moves, board_to_tensor, move_to_index, index_to_move,
    is_forbidden_black,
)


# ─── Board symmetry augmentation ─────────────────────────────────────────────

def _apply_sym(board_t, policy_t, k, flip):
    """Apply one of 8 board symmetries (4 rotations × optional horizontal flip)."""
    b = np.rot90(board_t, k, axes=(1, 2))
    p = np.rot90(policy_t.reshape(BOARD_SIZE, BOARD_SIZE), k)
    if flip:
        b = np.flip(b, axis=2)
        p = np.flip(p, axis=1)
    return b.copy(), p.flatten().copy()


def augment_sample(board_t, policy_t, outcome):
    """Return all 8 symmetric variants of a (board, policy, outcome) sample."""
    samples = []
    for k in range(4):
        for flip in (False, True):
            b, p = _apply_sym(board_t, policy_t, k, flip)
            samples.append((b, p, outcome))
    return samples


# ─── MCTS ────────────────────────────────────────────────────────────────────

class MCTSNode:
    __slots__ = ('parent', 'move', 'children', 'visits', 'value_sum',
                 'prior', 'is_black_turn', 'untried_moves')

    def __init__(self, parent, move, prior, is_black_turn, untried_moves):
        self.parent        = parent
        self.move          = move
        self.children      = {}          # move -> MCTSNode
        self.visits        = 0
        self.value_sum     = 0.0
        self.prior         = prior
        self.is_black_turn = is_black_turn
        self.untried_moves = untried_moves

    @property
    def q_value(self):
        if self.visits == 0:
            return 0.0
        return self.value_sum / self.visits

    def ucb(self, c_puct=1.5):
        parent_visits = self.parent.visits if self.parent else 1
        return self.q_value + c_puct * self.prior * math.sqrt(parent_visits) / (1 + self.visits)


def candidate_probs(board, is_black, model, device):
    """Network policy restricted to candidate moves — matches training behaviour."""
    candidates = get_candidate_moves(board, is_black)
    tensor = torch.from_numpy(board_to_tensor(board, is_black)).unsqueeze(0).to(device)
    with torch.no_grad():
        logits, value = model(tensor)
        logits = logits[0]
        mask = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=device)
        for r, c in candidates:
            mask[r * BOARD_SIZE + c] = 0.0
        if (mask == float('-inf')).all():
            mask.fill_(0.0)
        probs = torch.softmax(logits + mask, dim=0).cpu().numpy()
    return candidates, probs, float(value.item())


def mcts_search(board, is_black_turn, model, device, num_sims=50, temp=1.0,
                dirichlet_alpha=0.3, dirichlet_eps=0.25):
    """Run MCTS and return a probability distribution over moves.

    dirichlet_alpha / dirichlet_eps: AlphaGo Zero-style root exploration noise.
    Set dirichlet_eps=0 to disable (e.g. during evaluation / opponent moves).
    """
    root_moves, probs, _ = candidate_probs(board, is_black_turn, model, device)
    if not root_moves:
        return None, {}

    # Dirichlet noise at root for exploration
    if dirichlet_eps > 0 and len(root_moves) > 1:
        noise = np.random.dirichlet([dirichlet_alpha] * len(root_moves))
        noisy_probs = probs.copy()
        for i, (r, c) in enumerate(root_moves):
            idx = move_to_index(r, c)
            noisy_probs[idx] = (1 - dirichlet_eps) * probs[idx] + dirichlet_eps * noise[i]
        probs = noisy_probs

    root = MCTSNode(None, None, 1.0, is_black_turn, list(root_moves))
    # Initialize children with candidate-restricted priors (+ Dirichlet noise)
    for r, c in root_moves:
        idx = move_to_index(r, c)
        prior = float(probs[idx])
        child_board = board.copy()
        child_board[r, c] = BLACK if is_black_turn else WHITE
        child_moves = get_candidate_moves(child_board, not is_black_turn)
        root.children[(r, c)] = MCTSNode(root, (r, c), prior, not is_black_turn, child_moves)

    for _ in range(num_sims):
        node = root
        path = [node]
        sim_board = board.copy()

        # Selection — follow best UCB child
        while node.children and not node.untried_moves:
            best = max(node.children.values(), key=lambda n: n.ucb())
            r, c = best.move
            sim_board[r, c] = BLACK if node.is_black_turn else WHITE
            node = best
            path.append(node)

        # Expansion
        if node.untried_moves:
            r, c = node.untried_moves.pop()
            color = BLACK if node.is_black_turn else WHITE
            sim_board[r, c] = color

            # Network evaluation at new node — candidate-restricted priors
            child_is_black = not node.is_black_turn
            child_moves, child_probs, leaf_value = candidate_probs(
                sim_board, child_is_black, model, device)
            new_node = MCTSNode(node, (r, c), float(child_probs[move_to_index(r, c)]),
                                child_is_black, child_moves)
            node.children[(r, c)] = new_node
            path.append(new_node)

            # Check if terminal
            if check_five(sim_board, r, c, color):
                leaf_value = 1.0   # last player to move won
        else:
            leaf_value = 0.0

        # Backup
        v = leaf_value
        for n in reversed(path):
            n.visits += 1
            n.value_sum += v
            v = -v  # flip perspective

    # Build policy distribution from visit counts
    visit_counts = {move: child.visits for move, child in root.children.items()}
    total = sum(visit_counts.values()) or 1

    if temp == 0:
        best_move = max(visit_counts, key=visit_counts.get)
        policy_target = np.zeros(BOARD_SIZE * BOARD_SIZE, dtype=np.float32)
        policy_target[move_to_index(*best_move)] = 1.0
        return best_move, policy_target

    policy_target = np.zeros(BOARD_SIZE * BOARD_SIZE, dtype=np.float32)
    for (r, c), visits in visit_counts.items():
        policy_target[move_to_index(r, c)] = visits / total
    best_move = max(visit_counts, key=visit_counts.get)
    return best_move, policy_target


# ─── Opponent move (no MCTS — fast policy sampling) ──────────────────────────

@torch.no_grad()
def opponent_move(model, board, is_black, device, temperature=0.3):
    """Pick a move for the fixed opponent using policy network only (no MCTS)."""
    candidates, probs, _ = candidate_probs(board, is_black, model, device)
    if not candidates:
        return None
    indices = [move_to_index(r, c) for r, c in candidates]
    p = np.array([probs[i] for i in indices], dtype=np.float64)
    p = p ** (1.0 / max(temperature, 1e-3))
    p /= p.sum()
    chosen = candidates[np.random.choice(len(candidates), p=p)]
    return chosen


# ─── Self-play games ──────────────────────────────────────────────────────────

def self_play_game(model, device, num_sims=50, temp_threshold=15,
                   value_cap=0.95, resign_threshold=-0.9):
    """
    Symmetric self-play: one model plays both colors with MCTS.
    Returns list of (tensor, policy_target, value_target) for all moves.

    value_cap: soft-clip outcome targets to ±value_cap to prevent value overfit.
    resign_threshold: if root value < this, treat as loss (skip long losing games).
    """
    board = empty_board()
    history = []    # (tensor, policy_target, is_black_turn)

    # Center opening for Black
    cr = cc = BOARD_SIZE // 2
    board[cr, cc] = BLACK
    pt = np.zeros(BOARD_SIZE * BOARD_SIZE, dtype=np.float32)
    pt[move_to_index(cr, cc)] = 1.0
    history.append((board_to_tensor(board.copy(), True), pt, True))

    is_black_turn = False  # White moves next
    move_count = 1

    while move_count < 225:
        temp = 1.0 if move_count < temp_threshold else 0.0
        move, policy_target = mcts_search(board, is_black_turn, model, device, num_sims, temp)
        if move is None:
            break

        # Early resign: if value is very negative, treat current player as loser
        _, _, root_value = candidate_probs(board, is_black_turn, model, device)
        if move_count > temp_threshold and root_value < resign_threshold:
            winner_is_black = not is_black_turn  # current player resigns
            outcome = value_cap
            return [(t, pt, outcome if ib == winner_is_black else -outcome)
                    for t, pt, ib in history]

        r, c = move
        color = BLACK if is_black_turn else WHITE
        board[r, c] = color
        history.append((board_to_tensor(board.copy(), is_black_turn), policy_target, is_black_turn))

        if check_five(board, r, c, color):
            winner_is_black = is_black_turn
            return [(t, pt, value_cap if ib == winner_is_black else -value_cap)
                    for t, pt, ib in history]

        is_black_turn = not is_black_turn
        move_count += 1

    return []


def specialist_game(train_model, opp_model, train_is_black, device, num_sims=50, temp_threshold=15):
    """
    Specialist self-play: train_model plays one color with MCTS;
    opp_model plays the other color with fast policy sampling.
    Only returns training samples for train_model's moves.
    """
    board = empty_board()
    history = []    # (tensor, policy_target) — only specialist's moves

    cr = cc = BOARD_SIZE // 2
    board[cr, cc] = BLACK

    # If specialist is Black, record the forced center opening move
    if train_is_black:
        pt = np.zeros(BOARD_SIZE * BOARD_SIZE, dtype=np.float32)
        pt[move_to_index(cr, cc)] = 1.0
        history.append((board_to_tensor(board.copy(), True), pt))

    is_black_turn = False
    move_count = 1

    while move_count < 225:
        is_specialist_turn = (is_black_turn == train_is_black)
        color = BLACK if is_black_turn else WHITE

        if is_specialist_turn:
            temp = 1.0 if move_count < temp_threshold else 0.0
            move, policy_target = mcts_search(board, is_black_turn, train_model, device, num_sims, temp)
            if move is None:
                break
            r, c = move
            board[r, c] = color
            history.append((board_to_tensor(board.copy(), is_black_turn), policy_target))
        else:
            move = opponent_move(opp_model, board, is_black_turn, device)
            if move is None:
                break
            r, c = move
            board[r, c] = color

        move_count += 1

        if check_five(board, r, c, color):
            specialist_won = (is_black_turn == train_is_black)
            outcome = 1.0 if specialist_won else -1.0
            return [(t, pt, outcome) for t, pt in history]

        is_black_turn = not is_black_turn

    return []


# ─── Training step ────────────────────────────────────────────────────────────

def update_model(model, optimizer, replay_buffer, batch_size, device):
    if len(replay_buffer) < batch_size:
        return None, None

    batch = random.sample(replay_buffer, batch_size)
    boards, policy_targets, outcomes = zip(*batch)

    boards   = torch.from_numpy(np.stack(boards)).to(device)
    policies = torch.from_numpy(np.stack(policy_targets)).to(device)
    values   = torch.tensor(outcomes, dtype=torch.float32).unsqueeze(1).to(device)

    model.train()
    optimizer.zero_grad()
    policy_logits, value_out = model(boards)

    # Policy: KL divergence (cross-entropy with soft targets)
    log_probs = torch.log_softmax(policy_logits, dim=-1)
    p_loss = -(policies * log_probs).sum(dim=-1).mean()

    v_loss = nn.functional.mse_loss(value_out, values)
    loss = p_loss + v_loss
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()

    return p_loss.item(), v_loss.item()


# ─── Main loop ────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--checkpoint',    type=str, default='checkpoints/supervised.pt')
    p.add_argument('--out',           type=str, default='checkpoints/rl_final.pt')
    p.add_argument('--iterations',    type=int, default=30)
    p.add_argument('--games-per-iter',type=int, default=200)
    p.add_argument('--mcts-sims',     type=int, default=50)
    p.add_argument('--batch',         type=int, default=256)
    p.add_argument('--lr',            type=float, default=1e-4)
    p.add_argument('--buffer-size',   type=int, default=50_000)
    p.add_argument('--blocks',        type=int, default=6)
    p.add_argument('--channels',      type=int, default=64)
    # Specialist mode
    p.add_argument('--opponent', type=str, default=None, nargs='+',
                   help='Fixed opponent checkpoint(s) — one is sampled per game (opponent pool)')
    p.add_argument('--color', type=str, choices=['black', 'white'], default=None,
                   help='Color the trainable model plays in specialist mode')
    # Augmentation & exploration
    p.add_argument('--augment', action='store_true',
                   help='Apply 8-fold board symmetry augmentation to all samples')
    p.add_argument('--dirichlet-eps', type=float, default=0.25,
                   help='Dirichlet noise weight at MCTS root (0 = disabled, default 0.25)')
    p.add_argument('--dirichlet-alpha', type=float, default=0.3,
                   help='Dirichlet concentration parameter (default 0.3)')
    p.add_argument('--value-cap', type=float, default=0.95,
                   help='Soft-clip value targets to ±cap to prevent overfit (default 0.95)')
    p.add_argument('--resign-threshold', type=float, default=-0.9,
                   help='Resign when root value < threshold (default -0.9, set to -1 to disable)')
    p.add_argument('--max-steps-per-iter', type=int, default=100,
                   help='Cap gradient update steps per iteration (default 100)')
    p.add_argument('--warmup-games', type=int, default=0,
                   help='Games to play before training begins to pre-fill replay buffer (default 0)')
    p.add_argument('--eval-games', type=int, default=20,
                   help='Games to evaluate new vs old checkpoint per iteration (0 = skip)')
    p.add_argument('--accept-threshold', type=float, default=0.55,
                   help='Min win rate vs previous checkpoint to accept update (default 0.55)')
    p.add_argument('--curriculum', type=str, default=None, nargs='+',
                   help='Ordered list of opponent checkpoints for curriculum self-play. '
                        'Upgrades to next opponent once win rate vs current exceeds accept-threshold.')
    return p.parse_args()


def load_opponent(path, blocks, channels, device):
    net = RenjuNet(num_blocks=blocks, channels=channels).to(device)
    ckpt = torch.load(path, map_location=device, weights_only=False)
    net.load_state_dict(ckpt['model_state_dict'])
    net.eval()
    return net


def eval_gate(new_model, ref_model, device, n_games=20, temperature=0.3):
    """
    Play n_games between new and ref, alternating colors.
    Returns win rate for new_model (draws = 0.5).
    """
    from tournament import pick_move  # reuse tournament inference
    wins = 0.0
    for i in range(n_games):
        if i % 2 == 0:
            result = _eval_game(new_model, ref_model, temperature, device)
            wins += 1.0 if result == 1 else (0.5 if result == 0 else 0.0)
        else:
            result = _eval_game(ref_model, new_model, temperature, device)
            wins += 1.0 if result == -1 else (0.5 if result == 0 else 0.0)
    return wins / n_games


@torch.no_grad()
def _eval_game(model_black, model_white, temperature, device):
    """Single game for eval gate — no MCTS, fast policy sampling."""
    board = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK
    is_black_turn = False
    move_count = 1
    while move_count < BOARD_SIZE * BOARD_SIZE:
        model = model_black if is_black_turn else model_white
        move = opponent_move(model, board, is_black_turn, device, temperature=temperature)
        if move is None:
            break
        r, c = move
        color = BLACK if is_black_turn else WHITE
        board[r, c] = color
        move_count += 1
        if check_five(board, r, c, color):
            return 1 if is_black_turn else -1
        is_black_turn = not is_black_turn
    return 0


def main():
    args = parse_args()
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    specialist_mode = args.opponent is not None
    if specialist_mode and args.color is None:
        raise ValueError('--color (black|white) required when using --opponent')

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')

    model = build_model(num_blocks=args.blocks, channels=args.channels).to(device)
    if os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'Loaded checkpoint: {args.checkpoint}')

    opp_pool = []
    curriculum_idx = 0
    curriculum_wins = 0  # consecutive wins vs current curriculum opponent
    if specialist_mode:
        train_is_black = (args.color == 'black')
        for p in args.opponent:
            opp_pool.append(load_opponent(p, args.blocks, args.channels, device))
        print(f'Specialist mode: training as {args.color.upper()} | '
              f'opponent pool size: {len(opp_pool)} | augment: {args.augment}')

    curriculum_opponents = []
    if args.curriculum:
        curriculum_opponents = [load_opponent(p, args.blocks, args.channels, device)
                                 for p in args.curriculum]
        print(f'Curriculum mode: {len(curriculum_opponents)} opponents, '
              f'starting with: {args.curriculum[0]}')

    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    replay_buffer = deque(maxlen=args.buffer_size)
    accepted = 0

    # Buffer warmup — fill before any training/eval to ensure meaningful gradient steps
    if args.warmup_games > 0:
        print(f'\nWarmup: playing {args.warmup_games} games to pre-fill buffer...')
        model.eval()
        for _ in tqdm(range(args.warmup_games), desc='Warmup'):
            if specialist_mode:
                opp = random.choice(opp_pool)
                s = specialist_game(model, opp, (args.color == 'black'), device, args.mcts_sims)
            elif curriculum_opponents:
                s = specialist_game(model, curriculum_opponents[0],
                                    (args.color == 'black') if args.color else True,
                                    device, args.mcts_sims)
            else:
                s = self_play_game(model, device, args.mcts_sims,
                                   args.value_cap, args.resign_threshold)
            for t, pt, outcome in s:
                if args.augment:
                    for aug in augment_sample(t, pt, outcome):
                        replay_buffer.append(aug)
                else:
                    replay_buffer.append((t, pt, outcome))
        print(f'  Buffer after warmup: {len(replay_buffer)} samples')

    for iteration in range(1, args.iterations + 1):
        print(f'\n── Iteration {iteration}/{args.iterations} ──')

        # Snapshot current weights for potential revert
        prev_state = {k: v.clone() for k, v in model.state_dict().items()}

        # Self-play — eval mode so BatchNorm uses running stats (not noisy batch stats at bs=1)
        model.eval()
        new_samples = 0
        desc = f'Specialist ({args.color})' if specialist_mode else 'Self-play'
        with tqdm(total=args.games_per_iter, desc=desc) as pbar:
            for _ in range(args.games_per_iter):
                if specialist_mode:
                    opp_model = random.choice(opp_pool)
                    samples = specialist_game(model, opp_model, train_is_black, device,
                                              num_sims=args.mcts_sims)
                elif curriculum_opponents:
                    curr_opp = curriculum_opponents[curriculum_idx]
                    curr_is_black = (args.color == 'black') if args.color else True
                    samples = specialist_game(model, curr_opp, curr_is_black, device,
                                              num_sims=args.mcts_sims)
                else:
                    samples = self_play_game(model, device, num_sims=args.mcts_sims,
                                             value_cap=args.value_cap,
                                             resign_threshold=args.resign_threshold)

                for t, pt, outcome in samples:
                    if args.augment:
                        for aug in augment_sample(t, pt, outcome):
                            replay_buffer.append(aug)
                    else:
                        replay_buffer.append((t, pt, outcome))
                new_samples += len(samples)
                pbar.update(1)
                pbar.set_postfix(buffer=len(replay_buffer))

        print(f'  New positions: {new_samples}   Buffer: {len(replay_buffer)}')

        # Training — min 20 steps to ensure meaningful update even with small buffer
        steps = min(args.max_steps_per_iter, max(20, len(replay_buffer) // args.batch))
        p_losses, v_losses = [], []
        for _ in range(steps):
            pl, vl = update_model(model, optimizer, list(replay_buffer), args.batch, device)
            if pl is not None:
                p_losses.append(pl)
                v_losses.append(vl)

        if p_losses:
            print(f'  Policy loss: {np.mean(p_losses):.4f}   Value loss: {np.mean(v_losses):.4f}  '
                  f'({steps} steps)')

        # Evaluation gate — revert if new model doesn't beat previous
        if args.eval_games > 0:
            ref = RenjuNet(num_blocks=args.blocks, channels=args.channels).to(device)
            ref.load_state_dict(prev_state)
            ref.eval()
            model.eval()
            win_rate = eval_gate(model, ref, device, args.eval_games)
            if win_rate >= args.accept_threshold:
                accepted += 1
                print(f'  Eval gate: ACCEPTED  (win rate {win_rate:.0%} ≥ {args.accept_threshold:.0%})  '
                      f'[{accepted} accepted total]')
                # Curriculum: check if ready to upgrade opponent
                if curriculum_opponents and curriculum_idx < len(curriculum_opponents) - 1:
                    curriculum_wins += 1
                    if curriculum_wins >= 2:  # 2 consecutive accepts → upgrade
                        curriculum_idx += 1
                        curriculum_wins = 0
                        print(f'  Curriculum: upgraded to opponent {curriculum_idx}: '
                              f'{args.curriculum[curriculum_idx]}')
            else:
                curriculum_wins = 0
                model.load_state_dict(prev_state)
                # Reset optimizer momentum so stale gradients don't drag us backward
                optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
                print(f'  Eval gate: REVERTED  (win rate {win_rate:.0%} < {args.accept_threshold:.0%})')
                continue  # don't save a regressed checkpoint

        # Save checkpoint after accepted iteration
        torch.save({
            'iteration': iteration,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'args': vars(args),
        }, args.out)

    print(f'\nRL training complete. {accepted}/{args.iterations} iterations accepted. '
          f'Final checkpoint: {args.out}')


if __name__ == '__main__':
    main()
