"""
tournament_with_minimax.py — Round-robin tournament including minimax players.

Plays all pairs of:
  - NN checkpoints (listed in NN_MODELS below)
  - Minimax at depths listed in MINIMAX_DEPTHS

The Elo ratings are computed fresh for this pool.
Anchor: black_expert_v2 and white_expert_v2 from the existing NN tournament
are assigned their known Elo (1603 / 1553) as starting points, so the
minimax ratings end up on the same scale.

Usage:
    python3 tournament_with_minimax.py [--games 25] [--temperature 0.3]
"""

import argparse, os, sys
from itertools import combinations
from collections import defaultdict

import numpy as np
import torch

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_candidate_moves, get_best_move, is_forbidden_black,
)

# ── Known Elo anchors from prior NN tournament ────────────────────────────────
KNOWN_ELO = {
    'black_expert_v2': 1603.0,
    'white_expert_v2': 1553.0,
    'black_human_ft':  1337.0,
    'white_human_ft':  1422.0,
}

NN_MODELS = [
    ('black_expert_v2', 'checkpoints/black_expert_v2.pt'),
    ('white_expert_v2', 'checkpoints/white_expert_v2.pt'),
    ('black_human_ft',  'checkpoints/black_human_ft.pt'),
    ('white_human_ft',  'checkpoints/white_human_ft.pt'),
]

MINIMAX_DEPTHS = [1, 2, 3, 4, 5]

# ── Model wrappers ─────────────────────────────────────────────────────────────

class NNPlayer:
    def __init__(self, name, path, device='cpu'):
        self.name = name
        ckpt = torch.load(path, map_location=device, weights_only=False)
        state = ckpt.get('model_state_dict', ckpt)
        fw = [v for k,v in state.items() if 'input_block' in k and 'weight' in k]
        ch = fw[0].shape[0] if fw else 64
        tk = [k for k in state if k.startswith('tower.')]
        nb = max((int(k.split('.')[1]) for k in tk), default=5) + 1
        net = RenjuNet(num_blocks=nb, channels=ch).to(device)
        net.load_state_dict(state, strict=True)
        net.eval()
        self.net = net
        self.device = device

    @torch.no_grad()
    def pick_move(self, board, is_black, temperature=0.3):
        tensor = board_to_tensor(board, is_black)
        x = torch.tensor(tensor, dtype=torch.float32, device=self.device).unsqueeze(0)
        logits, _ = self.net(x)
        logits = logits[0]
        candidates = get_candidate_moves(board, is_black)
        mask = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=self.device)
        for r, c in candidates:
            if board[r, c] == EMPTY:
                mask[r * BOARD_SIZE + c] = 0.0
        if (mask == float('-inf')).all():
            for r in range(BOARD_SIZE):
                for c in range(BOARD_SIZE):
                    if board[r, c] == EMPTY:
                        mask[r * BOARD_SIZE + c] = 0.0
        temp = max(temperature, 1e-3)
        probs = torch.softmax((logits + mask) / temp, dim=0)
        dist = torch.distributions.Categorical(probs)
        idx = dist.sample().item()
        return idx // BOARD_SIZE, idx % BOARD_SIZE


class MinimaxPlayer:
    def __init__(self, depth):
        self.name = f'minimax_d{depth}'
        self.depth = depth

    def pick_move(self, board, is_black, temperature=None):
        return get_best_move(board, is_black, depth=self.depth)


# ── Game ───────────────────────────────────────────────────────────────────────

def play_game(player_black, player_white, temperature=0.3):
    board = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK
    is_black_turn = False
    move_count = 1
    while move_count < BOARD_SIZE * BOARD_SIZE:
        player = player_black if is_black_turn else player_white
        color  = BLACK if is_black_turn else WHITE
        move   = player.pick_move(board, is_black_turn, temperature)
        if move is None:
            break
        r, c = move
        if board[r, c] != EMPTY:
            break
        board[r, c] = color
        move_count += 1
        if check_five(board, r, c, color):
            return 1 if is_black_turn else -1
        is_black_turn = not is_black_turn
    return 0


# ── Elo helpers ────────────────────────────────────────────────────────────────

def expected(ra, rb):
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))

def update_elo(ratings, a, b, score_a, k=16):
    ea = expected(ratings[a], ratings[b])
    ratings[a] += k * (score_a - ea)
    ratings[b] += k * ((1 - score_a) - (1 - ea))


# ── Tournament ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--games', type=int, default=25)
    parser.add_argument('--temperature', type=float, default=0.3)
    args = parser.parse_args()

    players = []
    for name, path in NN_MODELS:
        full = os.path.join(SCRIPT_DIR, path)
        if not os.path.exists(full):
            print(f'[skip] {name}: not found'); continue
        players.append(NNPlayer(name, full))
        print(f'Loaded NN: {name}')
    for d in MINIMAX_DEPTHS:
        players.append(MinimaxPlayer(d))
        print(f'Added minimax depth={d}')

    names = [p.name for p in players]
    # Initialise Elo from known anchors, default 1500
    ratings = {name: KNOWN_ELO.get(name, 1500.0) for name in names}

    pairs = list(combinations(range(len(players)), 2))
    total = len(pairs) * 2 * args.games
    done  = 0

    wins  = defaultdict(lambda: defaultdict(int))
    losses= defaultdict(lambda: defaultdict(int))

    print(f'\n{len(players)} players · {len(pairs)} pairs · {total} games\n')

    for i, j in pairs:
        pi, pj = players[i], players[j]
        ni, nj = pi.name, pj.name

        # Skip minimax vs minimax — not useful for Elo anchoring
        if isinstance(pi, MinimaxPlayer) and isinstance(pj, MinimaxPlayer):
            continue

        for side in range(2):
            pb = pi if side == 0 else pj
            pw = pj if side == 0 else pi
            nb_name = pb.name; nw_name = pw.name

            for _ in range(args.games):
                result = play_game(pb, pw, args.temperature)
                if result == 1:
                    wins[nb_name][nw_name] += 1
                    update_elo(ratings, nb_name, nw_name, 1.0)
                elif result == -1:
                    wins[nw_name][nb_name] += 1
                    update_elo(ratings, nb_name, nw_name, 0.0)
                else:
                    update_elo(ratings, nb_name, nw_name, 0.5)
                done += 1
                if done % 10 == 0:
                    print(f'  {done}/{total} games...', end='\r')

    print(f'  {done} games done\n')

    # ── Results ──────────────────────────────────────────────────────────────
    ranked = sorted(ratings.items(), key=lambda x: -x[1])
    print('─' * 52)
    print(f'{"ELO LEADERBOARD":^52}')
    print('─' * 52)
    for rank, (name, elo) in enumerate(ranked, 1):
        print(f'  {rank:<4} {name:<30} {elo:>7.1f}')

    print('\n─' * 52)
    print('// GOLDEN_DATA update suggestion:')
    for name, elo in ranked:
        print(f"  {{ label: '{name}', elo: {elo:.0f} }},")

    import json
    out = {'ratings': dict(ranked), 'games_per_side': args.games}
    outpath = os.path.join(SCRIPT_DIR, '../eval/elo_with_minimax_v1.json')
    with open(outpath, 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nSaved to {outpath}')

if __name__ == '__main__':
    main()
