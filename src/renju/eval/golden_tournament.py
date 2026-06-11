"""
golden_tournament.py — Evaluate all key checkpoints + minimax on the golden dataset.

Usage:
    python3 golden_tournament.py [--in golden_set_v1.jsonl] [--out golden_tournament_v1.json]

Evaluated systems:
  NN checkpoints (each on all positions):
    supervised, rl_v2, rl_vs_minimax, rl_dual,
    black_expert, white_expert, black_expert_v2 (deployed), white_expert_v2 (deployed),
    black_human_ft, white_human_ft, black_expert_v2_gym
  Minimax depths 1, 2, 3, 4, 5

Each NN model is evaluated as:
  - "solo" (single checkpoint for both colors) — shows raw model strength
  - colour-paired models (black_expert_v2 + white_expert_v2) are also evaluated
    together as "deployed" (matching the browser behaviour).
"""

import sys
import os
import json
import argparse
import time
import numpy as np

# ── path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR  = os.path.join(SCRIPT_DIR, '../train')
sys.path.insert(0, TRAIN_DIR)

import torch
import torch.nn.functional as F
from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY, is_forbidden_black,
    get_candidate_moves, get_best_move,
)

# ── constants ─────────────────────────────────────────────────────────────────
COL_LABELS  = 'ABCDEFGHIJKLMNO'
CKPT_DIR    = os.path.join(TRAIN_DIR, 'checkpoints')
DEVICE      = 'cpu'

# Terminal checkpoints to evaluate (name → path within CKPT_DIR)
NN_CHECKPOINTS = [
    ('supervised',         'supervised.pt'),
    ('rl_v2',              'rl_v2.pt'),
    ('rl_vs_minimax',      'rl_vs_minimax.pt'),
    ('rl_dual',            'rl_dual.pt'),
    ('black_expert',       'black_expert.pt'),
    ('white_expert',       'white_expert.pt'),
    ('black_expert_v2',    'black_expert_v2.pt'),     # deployed Black
    ('white_expert_v2',    'white_expert_v2.pt'),     # deployed White
    ('black_human_ft',     'black_human_ft.pt'),
    ('white_human_ft',     'white_human_ft.pt'),
    ('black_expert_v2_gym','black_expert_v2_gym.pt'),
]

MINIMAX_DEPTHS = [1, 2, 3, 4, 5]

# ── helpers ───────────────────────────────────────────────────────────────────

def from_notation(n):
    """'H10' → (row=9, col=7)  (0-indexed, row=rank-1)"""
    n = str(n).strip()
    col = COL_LABELS.index(n[0])
    row = int(n[1:]) - 1
    return row, col

def to_notation(r, c):
    return f'{COL_LABELS[c]}{r + 1}'

def build_board(black_list, white_list):
    board = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8)
    for n in black_list:
        r, c = from_notation(n); board[r, c] = BLACK
    for n in white_list:
        r, c = from_notation(n); board[r, c] = WHITE
    return board

def board_to_tensor(board, is_black):
    """Build (1,3,15,15) float32 tensor."""
    player_ch = (board == (BLACK if is_black else WHITE)).astype(np.float32)
    opp_ch    = (board == (WHITE if is_black else BLACK)).astype(np.float32)
    side_ch   = np.ones((BOARD_SIZE, BOARD_SIZE), dtype=np.float32) if is_black \
                else np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.float32)
    t = np.stack([player_ch, opp_ch, side_ch])[None]  # (1,3,15,15)
    return torch.from_numpy(t)

def load_model(path):
    ckpt = torch.load(path, map_location=DEVICE, weights_only=False)
    state = ckpt.get('model_state_dict', ckpt)
    # detect size
    first_conv = [v for k, v in state.items() if 'input_block' in k and 'weight' in k]
    channels = first_conv[0].shape[0] if first_conv else 64
    tower_keys = [k for k in state if k.startswith('tower.')]
    max_block = max((int(k.split('.')[1]) for k in tower_keys), default=5)
    num_blocks = max_block + 1
    net = RenjuNet(num_blocks=num_blocks, channels=channels).to(DEVICE)
    net.load_state_dict(state, strict=True)
    net.eval()
    return net

def get_legal_cells(board, is_black):
    """Return set of (r,c) that are legal (empty, no forbidden for Black)."""
    empty_cells = list(zip(*np.where(board == EMPTY)))
    if not empty_cells:
        return []
    if is_black:
        return [(r,c) for r,c in empty_cells if not is_forbidden_black(board, r, c)[0]]
    return list(empty_cells)

@torch.no_grad()
def nn_predict(net, board, is_black, top_k=3):
    """Return list of top_k notation strings after filtering illegal/forbidden."""
    t = board_to_tensor(board, is_black)
    policy_logits, _ = net(t)
    logits = policy_logits[0].cpu().numpy()   # (225,)

    legal = get_legal_cells(board, is_black)
    if not legal:
        return []

    # Build masked scores
    scores = []
    for r, c in legal:
        scores.append((logits[r * BOARD_SIZE + c], r, c))
    scores.sort(reverse=True)
    return [to_notation(r, c) for _, r, c in scores[:top_k]]

def minimax_predict(board, is_black, depth):
    move = get_best_move(board, is_black, depth=depth)
    if move is None:
        return None
    return to_notation(*move)

# ── metrics ───────────────────────────────────────────────────────────────────

def empty_metrics():
    return dict(total=0, labeled=0, top1_correct=0, top3_correct=0,
                forbidden_checks=0, forbidden_violations=0,
                forbidden_avoidance_correct=0)

def add_rates(m):
    r = dict(m)
    r['top1_accuracy']  = m['top1_correct'] / m['labeled']  if m['labeled']  else None
    r['top3_accuracy']  = m['top3_correct'] / m['labeled']  if m['labeled']  else None
    r['forbidden_violation_rate']    = m['forbidden_violations'] / m['forbidden_checks'] if m['forbidden_checks'] else None
    r['forbidden_avoidance_accuracy']= m['forbidden_avoidance_correct'] / m['forbidden_checks'] if m['forbidden_checks'] else None
    return r

def evaluate_nn(samples, net, label):
    overall = empty_metrics()
    by_cat  = {}
    t0 = time.time()

    for sample in samples:
        cat = sample['category']
        if cat not in by_cat:
            by_cat[cat] = empty_metrics()
        m = by_cat[cat]
        overall['total'] += 1; m['total'] += 1

        is_black = sample['side_to_move'] == 'black'
        board    = build_board(sample['black'], sample['white'])
        top3     = nn_predict(net, board, is_black, top_k=3)
        top1     = top3[0] if top3 else None

        best = sample.get('best_moves', [])
        if best:
            overall['labeled'] += 1; m['labeled'] += 1
            if top1 in best:
                overall['top1_correct'] += 1; m['top1_correct'] += 1
            if any(t in best for t in top3):
                overall['top3_correct'] += 1; m['top3_correct'] += 1

        forb = sample.get('forbidden_moves', [])
        if is_black and forb:
            overall['forbidden_checks'] += 1; m['forbidden_checks'] += 1
            if top1 in forb:
                overall['forbidden_violations'] += 1; m['forbidden_violations'] += 1
            else:
                overall['forbidden_avoidance_correct'] += 1; m['forbidden_avoidance_correct'] += 1

    elapsed = time.time() - t0
    return {
        'evaluator': label,
        'elapsed_s': round(elapsed, 1),
        'overall': add_rates(overall),
        'by_category': {k: add_rates(v) for k, v in by_cat.items()},
    }

def evaluate_minimax(samples, depth, label):
    overall = empty_metrics()
    by_cat  = {}
    t0 = time.time()

    for sample in samples:
        cat = sample['category']
        if cat not in by_cat:
            by_cat[cat] = empty_metrics()
        m = by_cat[cat]
        overall['total'] += 1; m['total'] += 1

        is_black = sample['side_to_move'] == 'black'
        board    = build_board(sample['black'], sample['white'])
        top1     = minimax_predict(board, is_black, depth)

        best = sample.get('best_moves', [])
        if best:
            overall['labeled'] += 1; m['labeled'] += 1
            if top1 in best:
                overall['top1_correct'] += 1; m['top1_correct'] += 1

        forb = sample.get('forbidden_moves', [])
        if is_black and forb:
            overall['forbidden_checks'] += 1; m['forbidden_checks'] += 1
            if top1 in forb:
                overall['forbidden_violations'] += 1; m['forbidden_violations'] += 1
            else:
                overall['forbidden_avoidance_correct'] += 1; m['forbidden_avoidance_correct'] += 1

    elapsed = time.time() - t0
    return {
        'evaluator': label,
        'elapsed_s': round(elapsed, 1),
        'overall': add_rates(overall),
        'by_category': {k: add_rates(v) for k, v in by_cat.items()},
    }

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--in',  dest='infile',  default=os.path.join(SCRIPT_DIR, 'golden_set_v1.jsonl'))
    parser.add_argument('--out', dest='outfile', default=os.path.join(SCRIPT_DIR, 'golden_tournament_v1.json'))
    args = parser.parse_args()

    print(f'Loading golden set from {args.infile}')
    with open(args.infile) as f:
        samples = [json.loads(l) for l in f if l.strip()]
    print(f'  {len(samples)} samples loaded')

    results = {}

    # ── NN checkpoints ────────────────────────────────────────────────────────
    for label, filename in NN_CHECKPOINTS:
        path = os.path.join(CKPT_DIR, filename)
        if not os.path.exists(path):
            print(f'  [skip] {label}: not found at {path}')
            continue
        print(f'Evaluating NN: {label} ...', end=' ', flush=True)
        try:
            net = load_model(path)
            result = evaluate_nn(samples, net, label)
            results[label] = result
            o = result['overall']
            t1 = o['top1_accuracy']
            t3 = o['top3_accuracy']
            fvr = o['forbidden_violation_rate']
            faa = o['forbidden_avoidance_accuracy']
            print(f'top1={t1:.0%}  top3={t3:.0%}  fvr={fvr:.0%}  faa={faa:.0%}  ({result["elapsed_s"]}s)')
        except Exception as e:
            print(f'ERROR: {e}')

    # ── Deployed pair: use black_expert_v2 for Black, white_expert_v2 for White ─
    b_path = os.path.join(CKPT_DIR, 'black_expert_v2.pt')
    w_path = os.path.join(CKPT_DIR, 'white_expert_v2.pt')
    if os.path.exists(b_path) and os.path.exists(w_path):
        print('Evaluating NN: deployed_pair (black_v2 + white_v2) ...', end=' ', flush=True)
        t0 = time.time()
        b_net = load_model(b_path)
        w_net = load_model(w_path)
        overall = empty_metrics()
        by_cat  = {}
        for sample in samples:
            cat = sample['category']
            if cat not in by_cat:
                by_cat[cat] = empty_metrics()
            m = by_cat[cat]
            overall['total'] += 1; m['total'] += 1
            is_black = sample['side_to_move'] == 'black'
            net   = b_net if is_black else w_net
            board = build_board(sample['black'], sample['white'])
            top3  = nn_predict(net, board, is_black, top_k=3)
            top1  = top3[0] if top3 else None
            best  = sample.get('best_moves', [])
            if best:
                overall['labeled'] += 1; m['labeled'] += 1
                if top1 in best:
                    overall['top1_correct'] += 1; m['top1_correct'] += 1
                if any(t in best for t in top3):
                    overall['top3_correct'] += 1; m['top3_correct'] += 1
            forb = sample.get('forbidden_moves', [])
            if is_black and forb:
                overall['forbidden_checks'] += 1; m['forbidden_checks'] += 1
                if top1 in forb:
                    overall['forbidden_violations'] += 1; m['forbidden_violations'] += 1
                else:
                    overall['forbidden_avoidance_correct'] += 1; m['forbidden_avoidance_correct'] += 1
        elapsed = time.time() - t0
        res = {'evaluator':'deployed_pair','elapsed_s':round(elapsed,1),
               'overall': add_rates(overall),
               'by_category': {k: add_rates(v) for k, v in by_cat.items()}}
        results['deployed_pair'] = res
        o = res['overall']
        print(f'top1={o["top1_accuracy"]:.0%}  top3={o["top3_accuracy"]:.0%}  '
              f'fvr={o["forbidden_violation_rate"]:.0%}  faa={o["forbidden_avoidance_accuracy"]:.0%}  ({elapsed:.1f}s)')

    # ── Minimax ───────────────────────────────────────────────────────────────
    for depth in MINIMAX_DEPTHS:
        label = f'minimax_d{depth}'
        print(f'Evaluating minimax depth={depth} ...', end=' ', flush=True)
        try:
            result = evaluate_minimax(samples, depth, label)
            results[label] = result
            o = result['overall']
            t1 = o['top1_accuracy']
            fvr = o['forbidden_violation_rate']
            faa = o['forbidden_avoidance_accuracy']
            print(f'top1={t1:.0%}  fvr={fvr:.0%}  faa={faa:.0%}  ({result["elapsed_s"]}s)')
        except Exception as e:
            print(f'ERROR: {e}')

    # ── Save ──────────────────────────────────────────────────────────────────
    output = {
        'golden_set': args.infile,
        'n_samples':  len(samples),
        'results':    results,
    }
    with open(args.outfile, 'w') as f:
        json.dump(output, f, indent=2)
    print(f'\nResults written to {args.outfile}')

    # ── Summary table ─────────────────────────────────────────────────────────
    print('\n══ SUMMARY ══════════════════════════════════════════════════════════')
    print(f'{"Evaluator":<28}  {"Top-1":>6}  {"Top-3":>6}  {"FVR":>6}  {"FAA":>6}')
    print('─' * 60)
    for label, res in results.items():
        o = res['overall']
        t1  = f"{o['top1_accuracy']:.0%}"  if o['top1_accuracy']  is not None else '  –  '
        t3  = f"{o['top3_accuracy']:.0%}"  if o['top3_accuracy']  is not None else '  –  '
        fvr = f"{o['forbidden_violation_rate']:.0%}"     if o['forbidden_violation_rate']     is not None else '  –  '
        faa = f"{o['forbidden_avoidance_accuracy']:.0%}" if o['forbidden_avoidance_accuracy'] is not None else '  –  '
        print(f'  {label:<26}  {t1:>6}  {t3:>6}  {fvr:>6}  {faa:>6}')

if __name__ == '__main__':
    main()
