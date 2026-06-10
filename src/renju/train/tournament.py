#!/usr/bin/env python3
"""
tournament.py — Round-robin NN vs NN tournament for Renju models.

Each pair plays N games with model A as Black and N games with model A as White.
Reports: win/loss matrix, per-color win rates, and Elo ratings.

Usage:
    python3 tournament.py \\
        checkpoints/black_expert.pt \\
        checkpoints/black_expert_v2.pt \\
        checkpoints/white_expert_v2.pt \\
        --games 50 --temperature 0.3
"""

import argparse, os, sys
from itertools import combinations
from collections import defaultdict

import numpy as np
import torch
import torch.nn.functional as F

from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor, get_candidate_moves,
)

# ── Model loading ──────────────────────────────────────────────────────────────

def load_model(path, device, blocks=6, channels=64):
    net = RenjuNet(num_blocks=blocks, channels=channels).to(device)
    ckpt = torch.load(path, map_location=device, weights_only=False)
    net.load_state_dict(ckpt['model_state_dict'])
    net.eval()
    return net


def short_name(path):
    return os.path.basename(path).replace('.pt', '')


# ── Single move ────────────────────────────────────────────────────────────────

@torch.no_grad()
def pick_move(model, board, is_black, temperature, device):
    tensor = board_to_tensor(board, is_black)
    x = torch.tensor(tensor, dtype=torch.float32, device=device).unsqueeze(0)
    logits, _ = model(x)
    logits = logits[0]

    candidates = get_candidate_moves(board, is_black)
    mask = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=device)
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
    dist  = torch.distributions.Categorical(probs)
    idx   = dist.sample().item()
    return idx // BOARD_SIZE, idx % BOARD_SIZE


# ── Play one game ──────────────────────────────────────────────────────────────

def play_game(model_black, model_white, temperature, device):
    """
    Returns: 1  = Black wins
             -1 = White wins
              0 = Draw
    """
    board = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK
    is_black_turn = False   # center placed; White goes next
    move_count = 1

    while move_count < BOARD_SIZE * BOARD_SIZE:
        model  = model_black if is_black_turn else model_white
        color  = BLACK if is_black_turn else WHITE
        move   = pick_move(model, board, is_black_turn, temperature, device)
        board[move[0], move[1]] = color
        move_count += 1

        if check_five(board, move[0], move[1], color):
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

def run_tournament(model_paths, games_per_side, temperature, device, blocks, channels):
    names  = [short_name(p) for p in model_paths]
    n      = len(names)
    models = [load_model(p, device, blocks, channels) for p in model_paths]
    print(f"Loaded {n} models | {games_per_side} games/side | temp={temperature}\n")

    # wins[i][j] = wins for model i when playing Black against model j as White
    wins_as_black = defaultdict(lambda: defaultdict(int))
    wins_as_white = defaultdict(lambda: defaultdict(int))
    draws         = defaultdict(lambda: defaultdict(int))
    total_games   = defaultdict(lambda: defaultdict(int))

    ratings = {name: 1500.0 for name in names}

    pairs = list(combinations(range(n), 2))
    total = len(pairs) * 2 * games_per_side
    done  = 0

    for i, j in pairs:
        ni, nj = names[i], names[j]

        # i plays Black, j plays White
        for _ in range(games_per_side):
            result = play_game(models[i], models[j], temperature, device)
            total_games[ni][nj] += 1
            total_games[nj][ni] += 1
            if result == 1:       # Black (i) wins
                wins_as_black[ni][nj] += 1
                score = 1.0
            elif result == -1:    # White (j) wins
                wins_as_white[nj][ni] += 1
                score = 0.0
            else:
                draws[ni][nj] += 1; draws[nj][ni] += 1
                score = 0.5
            update_elo(ratings, ni, nj, score)
            done += 1
            if done % max(1, total // 20) == 0:
                print(f"  {done}/{total} games...", end='\r')

        # j plays Black, i plays White
        for _ in range(games_per_side):
            result = play_game(models[j], models[i], temperature, device)
            total_games[nj][ni] += 1
            total_games[ni][nj] += 1
            if result == 1:       # Black (j) wins
                wins_as_black[nj][ni] += 1
                score = 1.0
            elif result == -1:    # White (i) wins
                wins_as_white[ni][nj] += 1
                score = 0.0
            else:
                draws[nj][ni] += 1; draws[ni][nj] += 1
                score = 0.5
            update_elo(ratings, nj, ni, score)
            done += 1
            if done % max(1, total // 20) == 0:
                print(f"  {done}/{total} games...", end='\r')

    print(f"  {done}/{total} games... done\n")
    return names, ratings, wins_as_black, wins_as_white, draws, total_games


# ── Pretty output ──────────────────────────────────────────────────────────────

def print_results(names, ratings, wins_as_black, wins_as_white, draws, total_games, games_per_side):
    SEP = "─" * 72

    # Elo leaderboard
    ranked = sorted(ratings.items(), key=lambda x: -x[1])
    print(SEP)
    print(f"{'ELO LEADERBOARD':^72}")
    print(SEP)
    print(f"  {'Rank':<6} {'Model':<40} {'Elo':>6}")
    print(f"  {'─'*4:<6} {'─'*38:<40} {'─'*4:>6}")
    for rank, (name, elo) in enumerate(ranked, 1):
        print(f"  {rank:<6} {name:<40} {elo:>6.1f}")

    # Head-to-head matrix (overall win rate)
    print(f"\n{SEP}")
    print(f"{'HEAD-TO-HEAD WIN RATE  (row beats col)':^72}")
    print(SEP)
    col_w = 12
    header = f"  {'':38}" + "".join(f"{n[:col_w]:>{col_w}}" for n in names)
    print(header)
    for ni in names:
        row = f"  {ni:<38}"
        for nj in names:
            if ni == nj:
                row += f"{'—':>{col_w}}"
            else:
                t = total_games[ni][nj]
                if t == 0:
                    row += f"{'n/a':>{col_w}}"
                else:
                    wb = wins_as_black[ni][nj]
                    ww = wins_as_white[ni][nj]
                    wr = (wb + ww + 0.5 * draws[ni][nj]) / t
                    row += f"{wr*100:>{col_w-1}.1f}%"
        print(row)

    # Per-color breakdown
    print(f"\n{SEP}")
    print(f"{'PER-COLOR WIN RATES':^72}")
    print(SEP)
    print(f"  {'Model':<38}  {'As Black':>10}  {'As White':>10}  {'Overall':>10}")
    print(f"  {'─'*36:<38}  {'─'*8:>10}  {'─'*8:>10}  {'─'*7:>10}")
    for name, elo in ranked:
        total_b, win_b = 0, 0
        total_w, win_w = 0, 0
        for opp in names:
            if opp == name: continue
            # games where `name` played Black
            total_b += games_per_side
            win_b   += wins_as_black[name][opp]
            # games where `name` played White
            total_w += games_per_side
            win_w   += wins_as_white[name][opp]
        wr_b = win_b / total_b if total_b else 0
        wr_w = win_w / total_w if total_w else 0
        total_all = total_b + total_w
        win_all   = win_b + win_w + 0.5 * sum(draws[name][o] for o in names if o != name)
        wr_all = win_all / total_all if total_all else 0
        print(f"  {name:<38}  {wr_b*100:>9.1f}%  {wr_w*100:>9.1f}%  {wr_all*100:>9.1f}%")

    print(f"\n{SEP}\n")


# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description='Round-robin NN vs NN tournament')
    p.add_argument('models', nargs='+', help='Checkpoint paths to compare')
    p.add_argument('--games',       type=int,   default=50,
                   help='Games per side per matchup (default: 50)')
    p.add_argument('--temperature', type=float, default=0.3,
                   help='Move temperature for both models (default: 0.3)')
    p.add_argument('--blocks',      type=int,   default=6)
    p.add_argument('--channels',    type=int,   default=64)
    return p.parse_args()


def main():
    args = parse_args()
    if len(args.models) < 2:
        print("Need at least 2 model checkpoints.", file=sys.stderr)
        sys.exit(1)
    for p in args.models:
        if not os.path.exists(p):
            print(f"Not found: {p}", file=sys.stderr)
            sys.exit(1)

    device = (
        torch.device('mps')  if torch.backends.mps.is_available() else
        torch.device('cuda') if torch.cuda.is_available() else
        torch.device('cpu')
    )
    print(f"Device: {device}")

    names, ratings, wins_b, wins_w, draws, totals = run_tournament(
        args.models, args.games, args.temperature, device, args.blocks, args.channels
    )
    print_results(names, ratings, wins_b, wins_w, draws, totals, args.games)


if __name__ == '__main__':
    main()
