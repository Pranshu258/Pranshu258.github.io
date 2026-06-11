"""
single_color_tournament.py — Fixed-role round-robin tournament.

For every pair (A, B), plays two fixed-role sets:
  1. A as Black, B as White  → updates black_elo[A] and white_elo[B]
  2. B as Black, A as White  → updates black_elo[B] and white_elo[A]

Two separate Elo pools:
  black_elo[player] = quality when playing as Black (first player)
  white_elo[player] = quality when playing as White (second player)

The cross-pool expected score formula is:
  expected(black_elo[A], white_elo[B])
which makes the two pools directly comparable on the same scale.

Usage:
    python3 single_color_tournament.py [--games 30] [--temperature 0.3]
"""

import argparse, os, sys, json
from itertools import combinations
from collections import defaultdict

import torch

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_candidate_moves, get_best_move,
)

NN_MODELS = [
    ('black_expert_v2', 'checkpoints/black_expert_v2.pt'),
    ('white_expert_v2', 'checkpoints/white_expert_v2.pt'),
    ('black_human_ft',  'checkpoints/black_human_ft.pt'),
    ('white_human_ft',  'checkpoints/white_human_ft.pt'),
]

MINIMAX_DEPTHS = [1, 2, 3, 4, 5]


# ── Players ────────────────────────────────────────────────────────────────────

class NNPlayer:
    def __init__(self, name, path, device='cpu'):
        self.name = name
        ckpt = torch.load(path, map_location=device, weights_only=False)
        state = ckpt.get('model_state_dict', ckpt)
        fw = [v for k, v in state.items() if 'input_block' in k and 'weight' in k]
        ch = fw[0].shape[0] if fw else 64
        tk = [k for k in state if k.startswith('tower.')]
        nb = max((int(k.split('.')[1]) for k in tk), default=5) + 1
        net = RenjuNet(num_blocks=nb, channels=ch).to(device)
        net.load_state_dict(state, strict=True)
        net.eval()
        self.net  = net
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
        temp  = max(temperature, 1e-3)
        probs = torch.softmax((logits + mask) / temp, dim=0)
        idx   = torch.distributions.Categorical(probs).sample().item()
        return idx // BOARD_SIZE, idx % BOARD_SIZE


class MinimaxPlayer:
    def __init__(self, depth):
        self.name  = f'minimax_d{depth}'
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


# ── Elo ────────────────────────────────────────────────────────────────────────

def expected(ra, rb):
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))

def update_cross_elo(black_ratings, white_ratings, b_name, w_name, score_b, k=16):
    """score_b = 1 if Black won, 0 if White won, 0.5 draw."""
    ea = expected(black_ratings[b_name], white_ratings[w_name])
    black_ratings[b_name] += k * (score_b - ea)
    white_ratings[w_name] += k * ((1 - score_b) - (1 - ea))


# ── Tournament ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--games',       type=int,   default=20)
    parser.add_argument('--temperature', type=float, default=0.3)
    args = parser.parse_args()

    players = []
    for name, path in NN_MODELS:
        full = os.path.join(SCRIPT_DIR, path)
        if not os.path.exists(full):
            print(f'[skip] {name}: not found'); continue
        players.append(NNPlayer(name, full))
        print(f'Loaded NN: {name}', flush=True)
    for d in MINIMAX_DEPTHS:
        players.append(MinimaxPlayer(d))
        print(f'Added minimax depth={d}', flush=True)

    names = [p.name for p in players]
    black_elo = {n: 1500.0 for n in names}
    white_elo = {n: 1500.0 for n in names}

    pairs = list(combinations(range(len(players)), 2))
    # Each pair → 2 fixed-role sets (A-Black/B-White, then B-Black/A-White)
    total = len(pairs) * 2 * args.games
    done  = 0

    # win_as_black[A][B] = wins when A played Black vs B as White
    win_as_black  = defaultdict(lambda: defaultdict(int))
    win_as_white  = defaultdict(lambda: defaultdict(int))
    games_as_black = defaultdict(lambda: defaultdict(int))
    games_as_white = defaultdict(lambda: defaultdict(int))

    print(f'\n{len(players)} players · {len(pairs)} pairs · {total} games\n')

    for i, j in pairs:
        pi, pj = players[i], players[j]
        ni, nj = pi.name, pj.name

        # Skip minimax vs minimax — too slow and not needed for NN comparison
        if isinstance(pi, MinimaxPlayer) and isinstance(pj, MinimaxPlayer):
            continue

        for (pb, pw, bn, wn) in [(pi, pj, ni, nj), (pj, pi, nj, ni)]:
            for _ in range(args.games):
                result = play_game(pb, pw, args.temperature)
                games_as_black[bn][wn] += 1
                games_as_white[wn][bn] += 1
                if result == 1:        # Black wins
                    win_as_black[bn][wn] += 1
                    score_b = 1.0
                elif result == -1:     # White wins
                    win_as_white[wn][bn] += 1
                    score_b = 0.0
                else:
                    score_b = 0.5
                update_cross_elo(black_elo, white_elo, bn, wn, score_b)
                done += 1
                if done % 20 == 0:
                    print(f'  {done}/{total} games...', end='\r', flush=True)

    print(f'  {done} games done\n')

    # ── Leaderboards ─────────────────────────────────────────────────────────
    ranked_black = sorted(black_elo.items(), key=lambda x: -x[1])
    ranked_white = sorted(white_elo.items(), key=lambda x: -x[1])

    print('─' * 56)
    print(f'{"BLACK ELO  (quality as first player)":^56}')
    print('─' * 56)
    for rank, (name, elo) in enumerate(ranked_black, 1):
        # total win rate as Black
        wb = sum(win_as_black[name].values())
        gb = sum(games_as_black[name].values())
        pct = 100 * wb / gb if gb else 0
        print(f'  {rank:<3} {name:<30} {elo:>7.1f}   ({wb}/{gb} = {pct:.0f}% as Black)')

    print()
    print('─' * 56)
    print(f'{"WHITE ELO  (quality as second player)":^56}')
    print('─' * 56)
    for rank, (name, elo) in enumerate(ranked_white, 1):
        ww = sum(win_as_white[name].values())
        gw = sum(games_as_white[name].values())
        pct = 100 * ww / gw if gw else 0
        print(f'  {rank:<3} {name:<30} {elo:>7.1f}   ({ww}/{gw} = {pct:.0f}% as White)')

    # ── Win-rate matrix ───────────────────────────────────────────────────────
    print('\n── Win rate as BLACK vs each opponent (White) ──')
    header = f'{"":>22}' + ''.join(f'{n:>18}' for n in names)
    print(header)
    for bn in names:
        row = f'{bn:>22}'
        for wn in names:
            if bn == wn:
                row += f'{"—":>18}'
            else:
                gb = games_as_black[bn][wn]
                wb = win_as_black[bn][wn]
                cell = f'{wb}/{gb}={100*wb/gb:.0f}%' if gb else '?'
                row += f'{cell:>18}'
        print(row)

    # ── Save ──────────────────────────────────────────────────────────────────
    out = {
        'black_elo': dict(ranked_black),
        'white_elo': dict(ranked_white),
        'games_per_side': args.games,
        'win_as_black': {k: dict(v) for k, v in win_as_black.items()},
        'win_as_white': {k: dict(v) for k, v in win_as_white.items()},
        'games_as_black': {k: dict(v) for k, v in games_as_black.items()},
        'games_as_white': {k: dict(v) for k, v in games_as_white.items()},
    }
    outpath = os.path.join(SCRIPT_DIR, '../eval/single_color_tournament_v1.json')
    with open(outpath, 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nSaved to {outpath}')


if __name__ == '__main__':
    main()
