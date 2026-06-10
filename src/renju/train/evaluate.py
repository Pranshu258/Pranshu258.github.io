"""
evaluate.py
Pit a trained model against the minimax AI and report win rates.

Accepts either an ONNX model (--model) or a PyTorch .pt checkpoint (--pt).
Results are printed to stdout and optionally appended to --log or --report-json.

Usage:
    # ONNX (single model) — honest eval: greedy play, fresh random seeds
    python evaluate.py --model ../public/models/renju_policy.onnx --games 100

    # ONNX specialist models, matching the deployed browser setup
    python evaluate.py --black-model ../../../../public/models/renju_black.onnx \
        --white-model ../../../../public/models/renju_white.onnx --games 100

    # PyTorch checkpoint (direct, no export needed — used by training loop)
    python evaluate.py --pt checkpoints/rl_vs_minimax_step00050.pt --games 20 --log eval_log.txt

    # Legacy reproducible eval (fixed seeds, temperature 0.3 — matches old behaviour)
    python evaluate.py --pt checkpoints/... --games 100 --temperature 0.3 --seed 0

    # Tournament-style report with seeded openings after the mandatory center move
    python evaluate.py --model ../../../../public/models/renju_black.onnx --games 20 \
        --max-minimax-depth 4 --opening-plies 2 --report-json eval_report.json

Honesty notes
─────────────
* --temperature 0   : NN plays greedily (argmax). Removing stochasticity shows the
                      model's true best move, not a lucky sample.
* --opening-plies 1 : raw blind games. Black's first stone is always the center.
                      Increase this to sample legal seeded openings after center.
* --seed not set    : per-game seeds are drawn from system entropy. Pass --seed N
                      to fix seeds for reproducibility (e.g. publishing a result).
"""

import argparse, json, sys
import numpy as np
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    get_best_move, get_candidate_moves,
)


def parse_args():
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group()
    g.add_argument('--model', type=str, help='ONNX model path')
    g.add_argument('--pt',    type=str, help='PyTorch .pt checkpoint path')
    p.add_argument('--black-model', type=str, default=None,
                   help='ONNX model path to use when the NN plays Black')
    p.add_argument('--white-model', type=str, default=None,
                   help='ONNX model path to use when the NN plays White')
    p.add_argument('--games',             type=int,   default=100)
    p.add_argument('--max-minimax-depth', type=int,   default=4)
    p.add_argument('--temperature',       type=float, default=0.0,
                   help='NN move temperature. 0 = greedy/argmax (honest); '
                        '>0 = stochastic sampling (used during training)')
    p.add_argument('--log',               type=str,   default=None,
                   help='Append results to this file')
    p.add_argument('--report-json',       type=str,   default=None,
                   help='Write a machine-readable tournament report to this path')
    p.add_argument('--opening-plies',     type=int,   default=1,
                   help='Total opening plies to pre-play. 1 = only Black center; '
                        '>1 samples legal moves after the mandatory center move.')
    p.add_argument('--max-moves',         type=int,   default=225,
                   help='Maximum total plies including the mandatory center move')
    p.add_argument('--seed',              type=int,   default=None,
                   help='Base RNG seed. Omit (default) to use system entropy '
                        'so every run covers different positions. Pass an int '
                        'to fix seeds for reproducibility.')
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
    candidates = get_candidate_moves(board, is_black)
    if not candidates:
        return None
    tensor = board_to_tensor(board, is_black).reshape(1, 3, BOARD_SIZE, BOARD_SIZE)
    logits, _ = infer_fn(tensor)
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


def random_opening_move(board, is_black):
    candidates = get_candidate_moves(board, is_black)
    if not candidates:
        return None
    return candidates[int(np.random.randint(len(candidates)))]


def color_label(is_black):
    return 'Black' if is_black else 'White'


def move_payload(move):
    return [int(move[0]), int(move[1])]


# ── Play one game ─────────────────────────────────────────────────────────────

def play_one(infer_fns, nn_is_black, minimax_depth, temperature, seed,
             opening_plies=1, max_moves=225):
    np.random.seed(seed)
    board = empty_board()
    center = (BOARD_SIZE // 2, BOARD_SIZE // 2)
    board[center] = BLACK
    is_black_turn = False
    moves_played = 1
    history = [{
        'color': 'Black',
        'move': move_payload(center),
        'agent': 'opening',
        'opening': True,
    }]

    for _ in range(1, opening_plies):
        if moves_played >= max_moves:
            break
        color = BLACK if is_black_turn else WHITE
        move = random_opening_move(board, is_black_turn)
        if move is None:
            return {
                'outcome': 0,
                'winner': 'draw',
                'reason': 'no_legal_opening_move',
                'moves': moves_played,
                'history': history,
            }
        r, c = move
        if board[r, c] != EMPTY:
            return {
                'outcome': 0,
                'winner': 'draw',
                'reason': 'illegal_opening_move',
                'moves': moves_played,
                'history': history,
            }
        board[r, c] = color
        moves_played += 1
        history.append({
            'color': color_label(is_black_turn),
            'move': move_payload(move),
            'agent': 'opening',
            'opening': True,
        })
        if check_five(board, r, c, color):
            nn_color = BLACK if nn_is_black else WHITE
            return {
                'outcome': 1 if color == nn_color else -1,
                'winner': 'nn' if color == nn_color else 'minimax',
                'winner_color': color_label(is_black_turn),
                'reason': 'five_in_row',
                'moves': moves_played,
                'history': history,
            }
        is_black_turn = not is_black_turn

    while moves_played < max_moves:
        color = BLACK if is_black_turn else WHITE
        if is_black_turn == nn_is_black:
            move = pick_move(infer_fns[is_black_turn], board, is_black_turn, temperature)
            agent = 'nn'
        else:
            move = get_best_move(board, is_black_turn, minimax_depth)
            agent = 'minimax'
        if move is None:
            return {
                'outcome': 0,
                'winner': 'draw',
                'reason': 'no_legal_move',
                'moves': moves_played,
                'history': history,
            }
        r, c = move
        if board[r, c] != EMPTY:
            return {
                'outcome': 0,
                'winner': 'draw',
                'reason': 'illegal_move',
                'moves': moves_played,
                'history': history,
            }
        board[r, c] = color
        moves_played += 1
        history.append({
            'color': color_label(is_black_turn),
            'move': move_payload(move),
            'agent': agent,
            'opening': False,
        })
        if check_five(board, r, c, color):
            nn_color = BLACK if nn_is_black else WHITE
            return {
                'outcome': 1 if color == nn_color else -1,
                'winner': 'nn' if color == nn_color else 'minimax',
                'winner_color': color_label(is_black_turn),
                'reason': 'five_in_row',
                'moves': moves_played,
                'history': history,
            }
        is_black_turn = not is_black_turn
    return {
        'outcome': 0,
        'winner': 'draw',
        'reason': 'max_moves',
        'moves': moves_played,
        'history': history,
    }


def summarize_games(games):
    summary = {'games': len(games), 'wins': 0, 'draws': 0, 'losses': 0}
    for game in games:
        if game['outcome'] == 1:
            summary['wins'] += 1
        elif game['outcome'] == 0:
            summary['draws'] += 1
        else:
            summary['losses'] += 1
    total = summary['games'] or 1
    summary['win_rate'] = summary['wins'] / total
    summary['draw_rate'] = summary['draws'] / total
    summary['loss_rate'] = summary['losses'] / total
    return summary


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    specialist_models = args.black_model or args.white_model
    if bool(args.black_model) != bool(args.white_model):
        raise SystemExit('--black-model and --white-model must be provided together')
    if specialist_models and (args.model or args.pt):
        raise SystemExit('--black-model/--white-model cannot be combined with --model or --pt')
    if not (args.model or args.pt or specialist_models):
        raise SystemExit('provide --model, --pt, or both --black-model and --white-model')
    if args.opening_plies < 1:
        raise SystemExit('--opening-plies must be at least 1 because Black opens at center')
    if args.opening_plies > args.max_moves:
        raise SystemExit('--opening-plies cannot exceed --max-moves')

    # Seed strategy:
    #   --seed N  → deterministic: game g uses seed N+g (legacy / reproducible)
    #   no --seed → draw fresh 32-bit seeds from system entropy each run,
    #               ensuring different board positions every invocation.
    rng = np.random.default_rng(args.seed)  # None → system entropy

    label = args.pt or args.model
    extra_info = ''

    if args.pt:
        infer_fn, ckpt = make_pt_fn(args.pt)
        infer_fns = {True: infer_fn, False: infer_fn}
        extra_info = (f"  step={ckpt.get('update','?')}  "
                      f"depth={ckpt.get('curriculum_depth','?')}  "
                      f"train_wr={ckpt.get('win_rate', 0):.0%}")
    elif args.model:
        infer_fn = make_onnx_fn(args.model)
        infer_fns = {True: infer_fn, False: infer_fn}
    else:
        infer_fns = {
            True: make_onnx_fn(args.black_model),
            False: make_onnx_fn(args.white_model),
        }
        label = f'Black model: {args.black_model}  White model: {args.white_model}'

    seed_label = str(args.seed) if args.seed is not None else 'random'
    lines = [f'Model: {label}{extra_info}',
             f'Games: {args.games}/config  Temp: {args.temperature}  '
             f'Seed: {seed_label}  Opening plies: {args.opening_plies}', '']

    depths = range(1, args.max_minimax_depth + 1)
    results = {}
    total_w = total_g = 0
    game_reports = []

    for depth in depths:
        for nn_color, clabel in [(True, 'Black'), (False, 'White')]:
            wins = draws = losses = 0
            # Pre-draw all game seeds for this configuration up front so the
            # entropy stream is the same regardless of depth/color loop order.
            game_seeds = rng.integers(0, 2**31, size=args.games).tolist()
            for g in range(args.games):
                game = play_one(infer_fns, nn_color, depth, args.temperature,
                                seed=game_seeds[g],
                                opening_plies=args.opening_plies,
                                max_moves=args.max_moves)
                outcome = game['outcome']
                if outcome == 1:   wins   += 1
                elif outcome == 0: draws  += 1
                else:              losses += 1
                game_reports.append({
                    'depth': depth,
                    'nn_color': clabel,
                    'seed': int(game_seeds[g]),
                    **game,
                })
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

    if args.report_json:
        by_depth = {
            str(depth): summarize_games([
                game for game in game_reports if game['depth'] == depth
            ])
            for depth in depths
        }
        by_depth_and_color = {
            str(depth): {
                color: summarize_games([
                    game for game in game_reports
                    if game['depth'] == depth and game['nn_color'] == color
                ])
                for color in ['Black', 'White']
            }
            for depth in depths
        }
        report = {
            'evaluator': 'train/evaluate.py',
            'model': label,
            'models': {
                'single': args.model or args.pt,
                'black': args.black_model,
                'white': args.white_model,
            },
            'games_per_config': args.games,
            'temperature': args.temperature,
            'seed': args.seed,
            'max_minimax_depth': args.max_minimax_depth,
            'opening_plies': args.opening_plies,
            'max_moves': args.max_moves,
            'overall': summarize_games(game_reports),
            'by_depth': by_depth,
            'by_depth_and_nn_color': by_depth_and_color,
            'games': game_reports,
        }
        with open(args.report_json, 'w') as f:
            json.dump(report, f, indent=2)
            f.write('\n')


if __name__ == '__main__':
    main()
