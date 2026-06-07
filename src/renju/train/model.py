"""
model.py
AlphaZero-style CNN for Renju.

Input  : (batch, 3, 15, 15)  float32
           ch0 = current player's stones
           ch1 = opponent's stones
           ch2 = side indicator (1=Black to move, 0=White)

Outputs:
  policy: (batch, 225)  raw logits — apply softmax before sampling
  value : (batch, 1)    tanh in [-1, 1], +1 = win for current player
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ResBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(channels, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(channels, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
        )

    def forward(self, x):
        return F.relu(x + self.net(x), inplace=True)


class RenjuNet(nn.Module):
    """
    Compact policy+value network suitable for in-browser ONNX inference.
    Default: 6 residual blocks × 64 filters ≈ 1.8 M parameters, ~7 MB float32.
    """

    def __init__(self, num_blocks: int = 6, channels: int = 64):
        super().__init__()

        # Input projection
        self.input_block = nn.Sequential(
            nn.Conv2d(3, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(inplace=True),
        )

        # Residual tower
        self.tower = nn.Sequential(*[ResBlock(channels) for _ in range(num_blocks)])

        # Policy head: conv → flatten → fc → 225 logits
        self.policy_head = nn.Sequential(
            nn.Conv2d(channels, 2, 1, bias=False),
            nn.BatchNorm2d(2),
            nn.ReLU(inplace=True),
            nn.Flatten(),
            nn.Linear(2 * 15 * 15, 225),
        )

        # Value head: conv → flatten → fc → tanh scalar
        self.value_conv = nn.Sequential(
            nn.Conv2d(channels, 1, 1, bias=False),
            nn.BatchNorm2d(1),
            nn.ReLU(inplace=True),
            nn.Flatten(),
        )
        self.value_fc = nn.Sequential(
            nn.Linear(15 * 15, 64),
            nn.ReLU(inplace=True),
            nn.Linear(64, 1),
            nn.Tanh(),
        )

    def forward(self, x: torch.Tensor):
        x = self.input_block(x)
        x = self.tower(x)
        policy = self.policy_head(x)
        value  = self.value_fc(self.value_conv(x))
        return policy, value

    @torch.no_grad()
    def predict(self, board_tensor: torch.Tensor):
        """Convenience wrapper: input (3,15,15) → (policy_probs 225, value scalar)."""
        self.eval()
        x = board_tensor.unsqueeze(0)           # (1, 3, 15, 15)
        policy_logits, value = self.forward(x)
        probs = torch.softmax(policy_logits, dim=-1).squeeze(0)  # (225,)
        return probs, value.item()


def build_model(num_blocks: int = 6, channels: int = 64) -> RenjuNet:
    return RenjuNet(num_blocks=num_blocks, channels=channels)


if __name__ == '__main__':
    import sys
    model = build_model()
    total = sum(p.numel() for p in model.parameters())
    print(f'Parameters : {total:,}')
    print(f'Model size : ≈ {total * 4 / 1e6:.1f} MB (float32)')

    dummy = torch.zeros(1, 3, 15, 15)
    pol, val = model(dummy)
    print(f'Policy out : {pol.shape}   Value out: {val.shape}')
