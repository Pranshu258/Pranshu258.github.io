"""
train_rl.py
Phase 2: Reinforcement learning via MCTS self-play fine-tuning.

The trained policy+value network guides Monte Carlo Tree Search (MCTS).
Self-play games are used to generate higher-quality training data, which
is then used to update the network.  The loop repeats until convergence.

Usage:
    python train_rl.py \\
        --checkpoint checkpoints/supervised.pt \\
        --iterations 30 \\
        --games-per-iter 200 \\
        --mcts-sims 50 \\
        --out checkpoints/rl_final.pt
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

from model import build_model
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, on_board, check_five,
    get_candidate_moves, board_to_tensor, move_to_index, index_to_move,
    is_forbidden_black,
)


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


def mcts_search(board, is_black_turn, model, device, num_sims=50, temp=1.0):
    """Run MCTS and return a probability distribution over moves."""

    def make_node(parent, move, prior, is_black):
        moves = get_candidate_moves(board, is_black)
        return MCTSNode(parent, move, prior, is_black, list(moves))

    root_moves = get_candidate_moves(board, is_black_turn)
    if not root_moves:
        return None, {}

    # Get network priors for root
    tensor = torch.from_numpy(board_to_tensor(board, is_black_turn)).unsqueeze(0).to(device)
    with torch.no_grad():
        policy_logits, _ = model(tensor)
        probs = torch.softmax(policy_logits, dim=-1).cpu().numpy().squeeze()  # (225,)

    root = MCTSNode(None, None, 1.0, is_black_turn, list(root_moves))
    # Initialize children with network priors
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

            # Network evaluation at new node
            child_is_black = not node.is_black_turn
            t = torch.from_numpy(board_to_tensor(sim_board, child_is_black)).unsqueeze(0).to(device)
            with torch.no_grad():
                child_logits, child_value = model(t)
                child_probs = torch.softmax(child_logits, dim=-1).cpu().numpy().squeeze()
                leaf_value = float(child_value.item())

            child_moves = get_candidate_moves(sim_board, child_is_black)
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


# ─── Self-play game ───────────────────────────────────────────────────────────

def self_play_game(model, device, num_sims=50, temp_threshold=15):
    """
    Play one game using MCTS guided by the model.
    Returns list of (tensor, policy_target, value_target).
    """
    board = empty_board()
    history = []    # (tensor, policy_target, is_black_turn)

    # Center opening for Black
    cr = cc = BOARD_SIZE // 2
    board[cr, cc] = BLACK
    tensor = board_to_tensor(board.copy(), True)
    pt = np.zeros(BOARD_SIZE * BOARD_SIZE, dtype=np.float32)
    pt[move_to_index(cr, cc)] = 1.0
    history.append((tensor, pt, True))

    is_black_turn = False  # White moves next
    move_count = 1

    while move_count < 225:
        temp = 1.0 if move_count < temp_threshold else 0.0
        move, policy_target = mcts_search(board, is_black_turn, model, device, num_sims, temp)
        if move is None:
            break

        r, c = move
        color = BLACK if is_black_turn else WHITE
        board[r, c] = color

        tensor = board_to_tensor(board.copy(), is_black_turn)
        history.append((tensor, policy_target, is_black_turn))

        if check_five(board, r, c, color):
            # Winner is the player who just moved
            winner_is_black = is_black_turn
            samples = []
            for t, pt, ib in history:
                outcome = 1.0 if ib == winner_is_black else -1.0
                samples.append((t, pt, outcome))
            return samples

        is_black_turn = not is_black_turn
        move_count += 1

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
    return p.parse_args()


def main():
    args = parse_args()
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')

    model = build_model(num_blocks=args.blocks, channels=args.channels).to(device)
    if os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location=device)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'Loaded checkpoint: {args.checkpoint}')

    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    replay_buffer = deque(maxlen=args.buffer_size)

    for iteration in range(1, args.iterations + 1):
        print(f'\n── Iteration {iteration}/{args.iterations} ──')

        # Self-play
        new_samples = 0
        with tqdm(total=args.games_per_iter, desc='Self-play') as pbar:
            for _ in range(args.games_per_iter):
                samples = self_play_game(model, device, num_sims=args.mcts_sims)
                for s in samples:
                    replay_buffer.append(s)
                new_samples += len(samples)
                pbar.update(1)
                pbar.set_postfix(buffer=len(replay_buffer))

        print(f'  New positions: {new_samples}   Buffer: {len(replay_buffer)}')

        # Training steps
        steps = max(1, len(replay_buffer) // args.batch)
        p_losses, v_losses = [], []
        for _ in range(steps):
            pl, vl = update_model(model, optimizer, list(replay_buffer), args.batch, device)
            if pl is not None:
                p_losses.append(pl)
                v_losses.append(vl)

        if p_losses:
            print(f'  Policy loss: {np.mean(p_losses):.4f}   Value loss: {np.mean(v_losses):.4f}')

        # Save checkpoint after each iteration
        torch.save({
            'iteration': iteration,
            'model_state_dict': model.state_dict(),
            'optimizer_state_dict': optimizer.state_dict(),
            'args': vars(args),
        }, args.out)

    print(f'\nRL training complete. Final checkpoint: {args.out}')


if __name__ == '__main__':
    main()
