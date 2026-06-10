"""
eval_all_checkpoints.py
Run win-rate evals across all training checkpoints to build a learning curve.

Evaluates each checkpoint as its specialist color vs minimax depth 3,
20 games per checkpoint, temperature=0 (greedy/honest).

Outputs: eval_curve.json
"""

import os, json, sys
import numpy as np
import torch
import torch.nn as nn

sys.path.insert(0, os.path.dirname(__file__))
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_best_move, get_candidate_moves, find_forced_move,
)
from model import RenjuNet

CKPT_DIR = os.path.join(os.path.dirname(__file__), 'checkpoints')
GAMES     = 30
DEPTH     = 3   # fixed benchmark opponent
TEMP      = 0.3 # stochastic — avoids identical games against deterministic minimax

# ── Phases: (phase_name, color, [checkpoint_filenames_in_order]) ──────────────
def sorted_steps(prefix, ext='.pt'):
    files = sorted(
        f for f in os.listdir(CKPT_DIR)
        if f.startswith(prefix) and f.endswith(ext) and 'step' in f
    )
    return files

PHASES = [
    {
        'name':  'Supervised',
        'color': 'both',
        'ckpts': ['supervised.pt'],
    },
    {
        'name':  'RL vs Minimax',
        'color': 'both',
        'ckpts': sorted_steps('rl_vs_minimax_step'),
    },
    {
        'name':  'Black Specialist',
        'color': 'black',
        'ckpts': sorted_steps('black_expert_step'),
    },
    {
        'name':  'White Specialist',
        'color': 'white',
        'ckpts': sorted_steps('white_expert_step'),
    },
    {
        'name':  'Human FT',
        'color': 'black',
        'ckpts': ['black_human_ft.pt'],
    },
    {
        'name':  'Human FT',
        'color': 'white',
        'ckpts': ['white_human_ft.pt'],
    },
    {
        'name':  'Tactical RL (Black)',
        'color': 'black',
        'ckpts': sorted_steps('black_expert_v2_step') + ['black_expert_v2.pt'],
    },
    {
        'name':  'Tactical RL (White)',
        'color': 'white',
        'ckpts': sorted_steps('white_expert_v2_step') + ['white_expert_v2.pt'],
    },
]

device = (
    torch.device('mps')  if torch.backends.mps.is_available() else
    torch.device('cuda') if torch.cuda.is_available() else
    torch.device('cpu')
)

def load_model(ckpt_path):
    model = RenjuNet(num_blocks=6, channels=64).to(device)
    ckpt  = torch.load(ckpt_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt['model_state_dict'])
    model.eval()
    return model

def infer(model, board, is_black):
    t = board_to_tensor(board, is_black)
    x = torch.tensor(t, dtype=torch.float32, device=device).unsqueeze(0)
    with torch.no_grad():
        logits, _ = model(x)
    logits = logits[0]
    cands  = get_candidate_moves(board, is_black)
    mask   = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=device)
    for r, c in cands:
        if board[r, c] == EMPTY:
            mask[r * BOARD_SIZE + c] = 0.0
    if (mask == float('-inf')).all():
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if board[r, c] == EMPTY:
                    mask[r * BOARD_SIZE + c] = 0.0
    if TEMP <= 0:
        idx = (logits + mask).argmax().item()
    else:
        probs = torch.softmax((logits + mask) / TEMP, dim=0).cpu().numpy()
        idx   = np.random.choice(len(probs), p=probs)
    return (idx // BOARD_SIZE, idx % BOARD_SIZE)

def play_game(model, nn_is_black, seed):
    np.random.seed(seed)
    board = empty_board()
    # Renju: Black always opens center
    cr, cc = BOARD_SIZE // 2, BOARD_SIZE // 2
    board[cr, cc] = BLACK
    is_black = False  # White moves next

    for _ in range(BOARD_SIZE * BOARD_SIZE - 1):
        nn_turn = (is_black == nn_is_black)
        color   = BLACK if is_black else WHITE
        if nn_turn:
            move = infer(model, board, is_black)
        else:
            # Stochastic minimax: occasionally pick 2nd-best to diversify games
            move = get_best_move(board, is_black, DEPTH)
        r, c = move
        board[r, c] = color
        if check_five(board, r, c, color):
            return 1 if nn_turn else -1
        is_black = not is_black
    return 0

def eval_checkpoint(ckpt_file, nn_is_black):
    path = os.path.join(CKPT_DIR, ckpt_file)
    if not os.path.exists(path):
        return None
    model = load_model(path)
    wins  = sum(1 for s in range(GAMES) if play_game(model, nn_is_black, seed=s) == 1)
    return round(wins / GAMES * 100, 1)

# ── Run all phases ─────────────────────────────────────────────────────────────
results = []
total   = sum(len(p['ckpts']) for p in PHASES)
done    = 0

for phase in PHASES:
    phase_color = phase['color']
    colors = ['black', 'white'] if phase_color == 'both' else [phase_color]

    for color in colors:
        nn_is_black = (color == 'black')
        series_name = f"{phase['name']} ({'Black' if nn_is_black else 'White'})"
        series = {'phase': phase['name'], 'color': color, 'name': series_name, 'points': []}

        for ckpt in phase['ckpts']:
            done += 1
            label = ckpt.replace('.pt', '')
            print(f"  [{done}/{total}] {series_name} | {label} ... ", end='', flush=True)
            wr = eval_checkpoint(ckpt, nn_is_black)
            if wr is not None:
                series['points'].append({'ckpt': label, 'win_rate': wr})
                print(f"{wr}%")
            else:
                print("MISSING")

        if series['points']:
            results.append(series)

out = os.path.join(os.path.dirname(__file__), 'eval_curve.json')
with open(out, 'w') as f:
    json.dump(results, f, indent=2)

print(f"\nSaved → {out}")
