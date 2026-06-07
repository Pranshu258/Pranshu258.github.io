"""
evaluate.py
Pit a trained model against the minimax AI and report win rates.

Accepts either an ONNX model (--model) or a PyTorch .pt checkpoint (--pt).
Results are printed to stdout and optionally appended to --log.

Usage:
    # ONNX (browser model)
    python evaluate.py --model ../public/models/renju_policy.onnx --games 30

    # PyTorch checkpoint (direct, no export needed — used by training loop)
    python evaluate.py --pt checkpoints/rl_vs_minimax_step00050.pt --games 20 --log eval_log.txt
"""

import argparse, sys
import numpy as np
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_best_move, get_candidate_moves,
)


def parse_args():
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument('--model', type=str, help='ONNX model path')
    g.add_argument('--pt',    type=str, help='PyTorch .pt checkpoint path')
    p.add_argument('--games',             type=int,   default=30)
    p.add_argument('--max-minimax-depth', type=int,   default=4)
    p.add_argument('--temperature',       type=float, default=0.3)
    p.add_argument('--log',               type=str,   default=None,
                   help='Append results to this file')
    p.add_argument('--seed',              type=int,   default=0)
    return p.parse_args()


# ── Model backends ─────────────────────────────────────────────────────────────

def make_onnx_fn(model_path):
    import onnxruntime as ort
    session = ort.InferenceSession(model_path)
    def infer(board_tensor):
        policy, value = session.run(['policy', 'value'], {'board': board_tensor})
        return policy[0], value[0][0]
    return infer


def make_pt_fn(ckpt_path):
    import torch
    from model import build_model
    device = torch.device('mps' if torch.backends.mps.is_available()
                          else 'cuda' if torch.cuda.is_available() else 'cpu')
    ckpt = torch.load(ckpt_path, map_location=device, weights_only=False)
    args = ckpt.get('args', {})
    model = build_model(args.get('blocks', 6), args.get('channels', 64)).to(device)
    model.load_state_dict(ckpt['model_state_dict'])
    model.eval()
    def infer(board_tensor):
        t = torch.from_numpy(board_tensor).to(device)
        with torch.no_grad():
            pol, val = model(t)
        return pol[0].cpu().numpy(), val[0, 0].item()
    return infer, ckpt


# ── Move selection ─────────────────────────────────────────────────────────────

def pick_move(infer_fn, board, is_black, temperature):
    tensor = board_to_tensor(board, is_black).reshape(1, 3, BOARD_SIZE, BOARD_SIZE)
    logits, _ = infer_fn(tensor)
    candidates = get_candidate_moves(board, is_black)
    if not candidates:
        return None
    masked = np.full(225, -1e9, dtype=np.float64)
    for r, c in candidates:
        masked[r * BOARD_SIZE + c] = logits[r * BOARD_SIZE + c]
    if temperature <= 0:
        idx = int(np.argmax(masked))
    else:
        masked -= masked.max()
        w = np.exp(masked / temperature); w /= w.sum()
        idx = int(np.random.choice(225, p=w))
    return idx // BOARD_SIZE, idx % BOARD_SIZE


# ── Play one game ─────────────────────────────────────────────────────────────

def play_one(infer_fn, nn_is_black, minimax_depth, temperature, seed):
    np.random.seed(seed)
    board = empty_board()
    board[BOARD_SIZE // 2, BOARD_SIZE // 2] = BLACK
    is_black_turn = False
    for _ in range(224):
        color = BLACK if is_black_turn else WHITE
        if is_black_turn == nn_is_black:
            move = pick_move(infer_fn, board, is_black_turn, temperature)
        else:
            move = get_best_move(board, is_black_turn, minimax_depth)
        if move is None:
            return 0
        r, c = move
        if board[r, c] != EMPTY:
            return 0
        board[r, c] = color
        if check_five(board, r, c, color):
            nn_color = BLACK if nn_is_black else WHITE
            return 1 if color == nn_color else -1
        is_black_turn = not is_black_turn
    return 0


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    np.random.seed(args.seed)

    label = args.pt or args.model
    extra_info = ''

    if args.pt:
        infer_fn, ckpt = make_pt_fn(args.pt)
        extra_info = (f"  step={ckpt.get('update','?')}  "
                      f"depth={ckpt.get('curriculum_depth','?')}  "
                      f"train_wr={ckpt.get('win_rate', 0):.0%}")
    else:
        infer_fn = make_onnx_fn(args.model)

    lines = [f'Model: {label}{extra_info}',
             f'Games: {args.games}/config  Temp: {args.temperature}', '']

    depths = range(1, args.max_minimax_depth + 1)
    results = {}
    total_w = total_g = 0

    for depth in depths:
        for nn_color, clabel in [(True, 'Black'), (False, 'White')]:
            wins = draws = losses = 0
            for g in range(args.games):
                outcome = play_one(infer_fn, nn_color, depth, args.temperature,
                                   seed=args.seed + g)
                if outcome == 1:   wins   += 1
                elif outcome == 0: draws  += 1
                else:              losses += 1
            key = f'NN({clabel}) vs minimax(d={depth})'
            results[key] = (wins, draws, losses)
            wr = wins / args.games * 100
            total_w += wins; total_g += args.games
            line = (f'{key:35s}  W={wins:3d}  D={draws:3d}  L={losses:3d}  '
                    f'win_rate={wr:.0f}%')
            lines.append(line)
            print(line, flush=True)

    sep = '─' * 60
    summary = f'Overall NN win rate: {total_w}/{total_g} = {100*total_w/total_g:.1f}%'
    lines += ['', sep, summary]
    print(); print(sep); print(summary)

    if args.log:
        with open(args.log, 'a') as f:
            f.write('\n'.join(lines) + '\n\n')


if __name__ == '__main__':
    main()
