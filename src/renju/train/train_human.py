"""
train_human.py
Fine-tune the Renju expert models on games played by a human opponent.

Strategy: offline REINFORCE on recorded game moves.
  - Winner's moves get reward +1  (reinforce what worked)
  - Loser's moves get reward -1   (discourage what failed)
  - Low learning rate + data mixing prevents forgetting of existing knowledge.

Usage:
    python train_human.py \\
        --games renju_human_games_TIMESTAMP.json \\
        --black-checkpoint checkpoints/black_best.pt \\
        --white-checkpoint checkpoints/white_best.pt \\
        --out-black ../public/models/renju_black.onnx \\
        --out-white ../public/models/renju_white.onnx

The script trains the Black expert on Black moves and the White expert on
White moves. Run export_onnx.py is called automatically at the end.

Tips:
  - 20-30 focused wins where you exploit the same weakness is enough.
  - Use --mix-ratio 0.3 to blend original training data and prevent forgetting.
  - If the model gets worse after training, reduce --lr or increase --mix-ratio.
"""

import argparse, json, os, shutil
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

from model import build_model
from game_engine import BOARD_SIZE, BLACK, WHITE, EMPTY, board_to_tensor

GRID_SIZE = 40  # pixel grid size used in the browser


# ── Data helpers ──────────────────────────────────────────────────────────────

def pixel_to_grid(moves):
    """Convert pixel coordinate move list [[x,y],...] to (row,col) list."""
    return [(y // GRID_SIZE, x // GRID_SIZE) for x, y in moves]


def move_to_index(move):
    """[x, y] pixel → flat index 0-224."""
    col = move[0] // GRID_SIZE
    row = move[1] // GRID_SIZE
    return row * BOARD_SIZE + col


def build_tensor(recorded_move):
    """
    Build a (3,15,15) board tensor from a recorded move dict.
    Fields: playerMoves, opponentMoves, isBlack, move.
    """
    board = np.zeros((BOARD_SIZE, BOARD_SIZE), dtype=np.int8)
    color     = BLACK if recorded_move['isBlack'] else WHITE
    opp_color = -color

    for px, py in recorded_move.get('playerMoves', []):
        r, c = py // GRID_SIZE, px // GRID_SIZE
        if 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE:
            board[r, c] = color
    for px, py in recorded_move.get('opponentMoves', []):
        r, c = py // GRID_SIZE, px // GRID_SIZE
        if 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE:
            board[r, c] = opp_color

    return board_to_tensor(board, recorded_move['isBlack'])


def load_human_games(path):
    """
    Returns two lists of (tensor, move_idx, reward) — one for Black, one for White.
    reward = +1 if the player who made this move WON, -1 if they LOST.
    """
    data = json.load(open(path))
    games = data.get('games', [])

    black_samples, white_samples = [], []

    for game in games:
        winner = game.get('winner')          # 'human' | 'nn'
        nn_color = game.get('nnColor', 'black')  # which color NN played
        human_color = game.get('humanColor', 'white')

        # Determine which color won
        if winner == 'human':
            winning_color = human_color
        elif winner == 'nn':
            winning_color = nn_color
        else:
            continue  # unfinished game

        for move_rec in game.get('moves', []):
            is_black = move_rec.get('isBlack', True)
            move_px  = move_rec.get('move')
            if not move_px:
                continue

            try:
                tensor    = build_tensor(move_rec)
                move_idx  = move_to_index(move_px)
                player_color = 'black' if is_black else 'white'
                reward    = 1.0 if player_color == winning_color else -1.0

                sample = (tensor, move_idx, reward)
                if is_black:
                    black_samples.append(sample)
                else:
                    white_samples.append(sample)
            except Exception as e:
                print(f'  Skipping malformed move: {e}')

    return black_samples, white_samples


def maybe_mix_original(human_samples, original_data_path, mix_ratio):
    """Blend human samples with original training data to prevent forgetting."""
    if not original_data_path or not os.path.exists(original_data_path):
        return human_samples

    n_original = int(len(human_samples) * mix_ratio / (1 - mix_ratio))
    if n_original == 0:
        return human_samples

    orig = np.load(original_data_path)
    boards   = orig['boards']
    moves    = orig['moves']
    outcomes = orig['outcomes']

    n_original = min(n_original, len(boards))
    idx = np.random.choice(len(boards), n_original, replace=False)

    mixed = list(human_samples)
    for i in idx:
        mixed.append((boards[i], int(moves[i]), float(outcomes[i])))

    np.random.shuffle(mixed)
    print(f'  Mixed {len(human_samples)} human + {n_original} original samples')
    return mixed


def make_loader(samples, batch_size):
    if not samples:
        return None
    boards   = torch.from_numpy(np.stack([s[0] for s in samples])).float()
    moves    = torch.tensor([s[1] for s in samples], dtype=torch.long)
    rewards  = torch.tensor([s[2] for s in samples], dtype=torch.float32)
    ds = TensorDataset(boards, moves, rewards)
    return DataLoader(ds, batch_size=batch_size, shuffle=True)


# ── Training ──────────────────────────────────────────────────────────────────

def train_one_expert(samples, checkpoint_path, out_checkpoint, device, args):
    if not samples:
        print('  No samples — skipping.')
        return False

    model = build_model(args.blocks, args.channels).to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)

    if os.path.exists(checkpoint_path):
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'  Loaded: {checkpoint_path}')
    else:
        print(f'  WARNING: checkpoint not found ({checkpoint_path}), training from scratch')

    loader = make_loader(samples, args.batch)

    model.train()
    for epoch in range(1, args.epochs + 1):
        total_loss = n = 0
        for boards, moves_t, rewards_t in loader:
            boards    = boards.to(device)
            moves_t   = moves_t.to(device)
            rewards_t = rewards_t.to(device)

            policy_logits, value_out = model(boards)

            # Offline REINFORCE: -log_prob(move) * reward
            log_probs   = torch.log_softmax(policy_logits, dim=-1)
            move_log_p  = log_probs.gather(1, moves_t.unsqueeze(1)).squeeze(1)

            # Normalise rewards per batch for stability
            r_norm = (rewards_t - rewards_t.mean()) / (rewards_t.std() + 1e-8)

            policy_loss = -(move_log_p * r_norm).mean()
            value_loss  = nn.functional.mse_loss(value_out.squeeze(1), rewards_t)
            loss        = policy_loss + value_loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            total_loss += loss.item(); n += 1

        if epoch % max(1, args.epochs // 5) == 0 or epoch == args.epochs:
            print(f'  Epoch {epoch:3d}/{args.epochs}  loss={total_loss/n:.4f}')

    torch.save({'model_state_dict': model.state_dict(), 'args': vars(args)}, out_checkpoint)
    print(f'  Saved → {out_checkpoint}')
    return True


# ── ONNX export ───────────────────────────────────────────────────────────────

def export_onnx(pt_path, onnx_path, blocks, channels):
    import onnx
    model = build_model(blocks, channels)
    ckpt = torch.load(pt_path, map_location='cpu', weights_only=False)
    model.load_state_dict(ckpt['model_state_dict'])
    model.eval()

    dummy = torch.zeros(1, 3, BOARD_SIZE, BOARD_SIZE)
    torch.onnx.export(
        model, dummy, onnx_path,
        opset_version=17,
        input_names=['board'], output_names=['policy', 'value'],
        dynamic_axes={'board': {0: 'batch'}, 'policy': {0: 'batch'}, 'value': {0: 'batch'}},
        do_constant_folding=True, dynamo=False,
    )
    # Merge external data sidecar if created
    data_file = onnx_path + '.data'
    if os.path.exists(data_file):
        m = onnx.load(onnx_path)
        onnx.save_model(m, onnx_path, save_as_external_data=False)
        os.remove(data_file)

    size = os.path.getsize(onnx_path) / 1e6
    print(f'  Exported → {onnx_path}  ({size:.1f} MB)')


# ── Main ───────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--games',            required=True, help='JSON file exported from the browser')
    p.add_argument('--black-checkpoint', default='checkpoints/black_best.pt')
    p.add_argument('--white-checkpoint', default='checkpoints/white_best.pt')
    p.add_argument('--out-black',        default='../public/models/renju_black.onnx')
    p.add_argument('--out-white',        default='../public/models/renju_white.onnx')
    p.add_argument('--original-data',    default='data/games.npz',
                   help='Original training data to mix in (prevents forgetting)')
    p.add_argument('--mix-ratio',        type=float, default=0.3,
                   help='Fraction of batch from original data (0 = human only, 0.5 = 50/50)')
    p.add_argument('--lr',               type=float, default=5e-5,
                   help='Learning rate — keep low (≤1e-4) to prevent forgetting')
    p.add_argument('--epochs',           type=int,   default=30)
    p.add_argument('--batch',            type=int,   default=32)
    p.add_argument('--blocks',           type=int,   default=6)
    p.add_argument('--channels',         type=int,   default=64)
    p.add_argument('--seed',             type=int,   default=42)
    return p.parse_args()


def main():
    args = parse_args()
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')
    print(f'Loading games from: {args.games}')

    black_samples, white_samples = load_human_games(args.games)
    print(f'  Raw samples — Black: {len(black_samples)}  White: {len(white_samples)}')

    # Log reward breakdown
    for label, samples in [('Black', black_samples), ('White', white_samples)]:
        wins  = sum(1 for _, _, r in samples if r > 0)
        total = len(samples)
        if total:
            print(f'  {label}: {wins}/{total} winning moves ({100*wins//total}%)')

    # Mix with original training data
    black_samples = maybe_mix_original(black_samples, args.original_data, args.mix_ratio)
    white_samples = maybe_mix_original(white_samples, args.original_data, args.mix_ratio)

    os.makedirs('checkpoints', exist_ok=True)

    print('\n── Training Black expert ──')
    black_trained = train_one_expert(
        black_samples,
        args.black_checkpoint,
        'checkpoints/black_human_ft.pt',
        device, args
    )

    print('\n── Training White expert ──')
    white_trained = train_one_expert(
        white_samples,
        args.white_checkpoint,
        'checkpoints/white_human_ft.pt',
        device, args
    )

    print('\n── Exporting to ONNX ──')
    if black_trained:
        export_onnx('checkpoints/black_human_ft.pt', args.out_black, args.blocks, args.channels)
    if white_trained:
        export_onnx('checkpoints/white_human_ft.pt', args.out_white, args.blocks, args.channels)

    print('\nDone. New models written to:')
    if black_trained: print(f'  {args.out_black}')
    if white_trained: print(f'  {args.out_white}')
    print('\nRun `npm run deploy` to push the updated models live.')


if __name__ == '__main__':
    main()
