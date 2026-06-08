"""
train_supervised.py
Phase 1: Supervised learning on minimax self-play data.

Usage:
    python train_supervised.py \\
        --data data/games.npz \\
        --epochs 80 \\
        --batch 256 \\
        --lr 1e-3 \\
        --out checkpoints/supervised.pt
"""

import argparse
import os
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset, random_split
from model import build_model


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--data',    type=str, default='data/games.npz')
    p.add_argument('--out',     type=str, default='checkpoints/supervised.pt')
    p.add_argument('--checkpoint', type=str, default=None,
                   help='Path to an existing .pt checkpoint to fine-tune from. '
                        'Omit to train from scratch.')
    p.add_argument('--epochs',  type=int, default=80)
    p.add_argument('--batch',   type=int, default=256)
    p.add_argument('--lr',      type=float, default=1e-3)
    p.add_argument('--val-split', type=float, default=0.05, help='Fraction held out for validation')
    p.add_argument('--blocks',  type=int, default=6)
    p.add_argument('--channels',type=int, default=64)
    p.add_argument('--seed',    type=int, default=0)
    return p.parse_args()


def load_dataset(path):
    data = np.load(path)
    boards   = torch.from_numpy(data['boards'])    # (N, 3, 15, 15)
    moves    = torch.from_numpy(data['moves']).long()   # (N,)
    outcomes = torch.from_numpy(data['outcomes'])  # (N,)
    return TensorDataset(boards, moves, outcomes)


def train_epoch(model, loader, optimizer, device, policy_weight=1.0, value_weight=1.0):
    model.train()
    ce_loss  = nn.CrossEntropyLoss()
    mse_loss = nn.MSELoss()

    total_loss = policy_loss = value_loss = 0.0
    correct = total = 0

    for boards, moves, outcomes in loader:
        boards   = boards.to(device)
        moves    = moves.to(device)
        outcomes = outcomes.to(device).unsqueeze(1)  # (B, 1)

        optimizer.zero_grad()
        policy_logits, value_out = model(boards)

        p_loss = ce_loss(policy_logits, moves)
        v_loss = mse_loss(value_out, outcomes)
        loss   = policy_weight * p_loss + value_weight * v_loss

        loss.backward()
        optimizer.step()

        total_loss  += loss.item()
        policy_loss += p_loss.item()
        value_loss  += v_loss.item()

        preds   = policy_logits.argmax(dim=1)
        correct += (preds == moves).sum().item()
        total   += moves.size(0)

    n = len(loader)
    return total_loss/n, policy_loss/n, value_loss/n, correct/total


@torch.no_grad()
def eval_epoch(model, loader, device):
    model.eval()
    ce_loss  = nn.CrossEntropyLoss()
    mse_loss = nn.MSELoss()

    total_loss = 0.0
    correct = total = 0

    for boards, moves, outcomes in loader:
        boards   = boards.to(device)
        moves    = moves.to(device)
        outcomes = outcomes.to(device).unsqueeze(1)

        policy_logits, value_out = model(boards)
        p_loss = ce_loss(policy_logits, moves)
        v_loss = mse_loss(value_out, outcomes)
        total_loss += (p_loss + v_loss).item()

        preds   = policy_logits.argmax(dim=1)
        correct += (preds == moves).sum().item()
        total   += moves.size(0)

    return total_loss / len(loader), correct / total


def main():
    args = parse_args()
    torch.manual_seed(args.seed)
    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)

    device = torch.device('cuda' if torch.cuda.is_available() else
                          'mps'  if torch.backends.mps.is_available() else 'cpu')
    print(f'Device: {device}')

    print(f'Loading {args.data} …')
    dataset = load_dataset(args.data)
    print(f'  {len(dataset):,} positions loaded')

    val_size   = int(len(dataset) * args.val_split)
    train_size = len(dataset) - val_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size],
                                    generator=torch.Generator().manual_seed(args.seed))

    pin = device.type == 'cuda'  # pin_memory only works on CUDA, not MPS
    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True,  num_workers=4, pin_memory=pin)
    val_loader   = DataLoader(val_ds,   batch_size=args.batch, shuffle=False, num_workers=2, pin_memory=pin)

    model = build_model(num_blocks=args.blocks, channels=args.channels).to(device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f'Model: {total_params:,} parameters')

    if args.checkpoint:
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        print(f'Fine-tuning from: {args.checkpoint}')

    optimizer = optim.Adam(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    best_val_loss = float('inf')

    for epoch in range(1, args.epochs + 1):
        tr_loss, tr_pol, tr_val, tr_acc = train_epoch(model, train_loader, optimizer, device)
        va_loss, va_acc = eval_epoch(model, val_loader, device)
        scheduler.step()

        saved = ''
        if va_loss < best_val_loss:
            best_val_loss = va_loss
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': va_loss,
                'args': vars(args),
            }, args.out)
            saved = '  ✓ saved'

        if epoch % 5 == 0 or epoch == 1:
            print(
                f'Epoch {epoch:3d}/{args.epochs}  '
                f'tr_loss={tr_loss:.4f}  tr_acc={tr_acc:.3f}  '
                f'va_loss={va_loss:.4f}  va_acc={va_acc:.3f}'
                f'{saved}'
            )

    print(f'\nBest validation loss: {best_val_loss:.4f}')
    print(f'Checkpoint saved to: {args.out}')


if __name__ == '__main__':
    main()
