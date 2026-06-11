"""
golden_training_curve.py — Eval all step checkpoints on the golden set
to build a training-progress curve using tactical accuracy instead of
win rate vs minimax.

Black-phase checkpoints evaluated on black-to-move positions (650).
White-phase checkpoints evaluated on white-to-move positions (350).
"""
import sys, os, json, time
import numpy as np
import torch

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR  = os.path.join(SCRIPT_DIR, '../train')
sys.path.insert(0, TRAIN_DIR)

from model import RenjuNet
from game_engine import BOARD_SIZE, BLACK, WHITE, EMPTY, is_forbidden_black

COL_LABELS = 'ABCDEFGHIJKLMNO'
CKPT_DIR   = os.path.join(TRAIN_DIR, 'checkpoints')

def from_notation(n):
    col = COL_LABELS.index(str(n)[0])
    row = int(str(n)[1:]) - 1
    return row, col

def build_board(black_list, white_list):
    b = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8)
    for n in black_list: r,c = from_notation(n); b[r,c] = BLACK
    for n in white_list:  r,c = from_notation(n); b[r,c] = WHITE
    return b

def board_to_tensor(board, is_black):
    p = (board == (BLACK if is_black else WHITE)).astype(np.float32)
    o = (board == (WHITE if is_black else BLACK)).astype(np.float32)
    s = np.ones((BOARD_SIZE, BOARD_SIZE), dtype=np.float32) if is_black \
        else np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.float32)
    return torch.from_numpy(np.stack([p,o,s])[None])

def load_model(path):
    ckpt  = torch.load(path, map_location='cpu', weights_only=False)
    state = ckpt.get('model_state_dict', ckpt)
    fw    = [v for k,v in state.items() if 'input_block' in k and 'weight' in k]
    ch    = fw[0].shape[0] if fw else 64
    tk    = [k for k in state if k.startswith('tower.')]
    nb    = max((int(k.split('.')[1]) for k in tk), default=5) + 1
    net   = RenjuNet(num_blocks=nb, channels=ch)
    net.load_state_dict(state, strict=True)
    net.eval()
    return net

@torch.no_grad()
def top1(net, board, is_black):
    t = board_to_tensor(board, is_black)
    logits, _ = net(t)
    lg = logits[0].cpu().numpy()
    empty = list(zip(*np.where(board == EMPTY)))
    if not empty: return None
    legal = [(r,c) for r,c in empty if not is_black or not is_forbidden_black(board,r,c)[0]]
    if not legal: return None
    r,c = max(legal, key=lambda rc: lg[rc[0]*BOARD_SIZE+rc[1]])
    return f'{COL_LABELS[c]}{r+1}'

def eval_checkpoint(path, samples):
    net = load_model(path)
    correct = total = 0
    for s in samples:
        if not s.get('best_moves'): continue
        board = build_board(s['black'], s['white'])
        pred  = top1(net, board, s['side_to_move']=='black')
        total += 1
        if pred in s['best_moves']: correct += 1
    return round(100 * correct / total, 1) if total else 0.0

def steps(prefix, start, stop, step=25):
    return [f'{prefix}_step{s:05d}' for s in range(start, stop+1, step)]

# ── checkpoint sequences per phase ───────────────────────────────────────────
BLACK_PHASES = [
    ('Supervised',      ['supervised']),
    ('RL vs Minimax',   [f'rl_vs_minimax_step{s:05d}' for s in range(50,601,50)]),
    ('Black Specialist',[f'black_expert_step{s:05d}' for s in range(275,1076,25)]),
    ('Human FT',        ['black_human_ft']),
    ('Tactical RL',     [f'black_expert_v2_step{s:05d}' for s in [50,100,150]] + ['black_expert_v2']),
]

WHITE_PHASES = [
    ('Supervised',      ['supervised']),
    ('RL vs Minimax',   [f'rl_vs_minimax_step{s:05d}' for s in range(50,601,50)]),
    ('White Specialist',[f'white_expert_step{s:05d}' for s in range(275,976,25)]),
    ('Human FT',        ['white_human_ft']),
    ('Tactical RL',     [f'white_expert_v2_step{s:05d}' for s in [50,100,150]] + ['white_expert_v2']),
]

def run_phases(phases, samples, label):
    results = []
    for phase_name, ckpts in phases:
        phase_pts = []
        for name in ckpts:
            path = os.path.join(CKPT_DIR, f'{name}.pt')
            if not os.path.exists(path):
                print(f'  [skip] {name}')
                continue
            acc = eval_checkpoint(path, samples)
            phase_pts.append(acc)
            print(f'  {name}: {acc:.1f}%')
        results.append((phase_name, phase_pts))
        print(f'  ── {phase_name}: {phase_pts}')
    return results

def main():
    with open(os.path.join(SCRIPT_DIR, 'golden_set_v1.jsonl')) as f:
        all_samples = [json.loads(l) for l in f if l.strip()]
    black_samples = [s for s in all_samples if s['side_to_move']=='black' and s.get('best_moves')]
    white_samples = [s for s in all_samples if s['side_to_move']=='white' and s.get('best_moves')]
    print(f'Black labeled: {len(black_samples)}, White labeled: {len(white_samples)}')

    print('\n=== BLACK phases ===')
    black_results = run_phases(BLACK_PHASES, black_samples, 'black')

    print('\n=== WHITE phases ===')
    white_results = run_phases(WHITE_PHASES, white_samples, 'white')

    out = {'black_phases': black_results, 'white_phases': white_results}
    outpath = os.path.join(SCRIPT_DIR, 'golden_training_curve_v1.json')
    with open(outpath, 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nSaved to {outpath}')

    # Print JS-ready arrays
    print('\n// BLACK_PHASES pts:')
    for name, pts in black_results:
        print(f"  // {name}: {pts}")
    print('\n// WHITE_PHASES pts:')
    for name, pts in white_results:
        print(f"  // {name}: {pts}")

if __name__ == '__main__':
    main()
