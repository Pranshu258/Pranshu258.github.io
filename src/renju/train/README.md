# Renju Neural Network — Training Pipeline

This directory contains all scripts needed to train a purpose-built CNN for Renju and export it for in-browser inference via ONNX Runtime Web.

## Prerequisites

```bash
cd train
pip install -r requirements.txt
```

---

## Pipeline Overview

```
generate_data.py  →  train_supervised.py  →  train_rl_vs_minimax.py  →  export_onnx.py
     ↓                      ↓                          ↓                        ↓
 data/games.npz   checkpoints/supervised.pt  checkpoints/rl_vs_minimax.pt  ../public/models/renju_policy.onnx
```

> **Note:** `train_rl.py` (MCTS self-play) is also available but `train_rl_vs_minimax.py` is
> recommended — it is faster (1 minimax call/move vs 50 MCTS simulations), uses a stronger
> teacher, and includes curriculum learning that automatically increases difficulty as the
> model improves.

---

## Step 1 — Generate Self-Play Data

Uses the minimax engine to generate thousands of self-play games.

```bash
python generate_data.py \
    --games 5000 \
    --out data/games.npz \
    --max-depth 5 \
    --epsilon 0.15
```

| Argument | Default | Description |
|---|---|---|
| `--games` | 5000 | Number of complete games |
| `--out` | `data/games.npz` | Output path |
| `--max-depth` | 5 | Upper bound for depth sampling. Each game draws Black and White depths independently from [1, max-depth], producing the full skill spectrum in one run. |
| `--epsilon` | 0.15 | Probability of playing a random legal move instead of the minimax best move. Creates diverse game lines without violating Renju rules. |

> ⏱ ~20–60 min depending on max-depth and CPU. Higher depths produce fewer but higher-quality games.

After generation, duplicated (board, move) pairs are automatically merged — their outcomes are averaged into a soft value label before saving.

---

## Step 2 — Supervised Pre-Training

Trains the CNN to imitate the minimax AI's move choices.

```bash
python train_supervised.py \
    --data data/games.npz \
    --out checkpoints/supervised.pt \
    --epochs 80 \
    --batch 256 \
    --lr 1e-3
```

| Argument | Default | Description |
|---|---|---|
| `--epochs` | 80 | Training epochs |
| `--batch` | 256 | Batch size |
| `--blocks` | 6 | Residual blocks |
| `--channels` | 64 | Filters per layer |

> Best checkpoint (lowest validation loss) is saved automatically.

---

## Step 3 — RL vs Minimax (Recommended)

Trains the model by playing directly against the minimax engine with curriculum learning.
Faster and stronger than MCTS self-play for this use case.

```bash
python train_rl_vs_minimax.py \
    --checkpoint checkpoints/supervised.pt \
    --out checkpoints/rl_vs_minimax.pt \
    --updates 500 \
    --games-per-update 16 \
    --start-depth 1 \
    --max-depth 6
```

| Argument | Default | Description |
|---|---|---|
| `--updates` | 500 | Gradient update steps |
| `--games-per-update` | 16 | Games per update (alternates NN color) |
| `--start-depth` | 1 | Starting minimax depth |
| `--max-depth` | 6 | Maximum curriculum depth |
| `--promote-threshold` | 0.6 | Win rate needed to advance depth |
| `--eval-window` | 50 | Games window for win rate tracking |
| `--temperature` | 1.0 | Policy temperature during training |

**Curriculum:** the model starts at minimax depth 1. When its win rate exceeds 60% over the
last 50 games, the minimax depth increases by 1 — automatically scaling difficulty to the
model's improving skill level.

> For stronger results, increase `--updates` to 2000+ and `--max-depth` to 8.
> The `rl_vs_minimax.pt` checkpoint saves only when a new best win rate is achieved.

---

## Step 3 (alternative) — RL Fine-Tuning via MCTS Self-Play

```bash
python train_rl.py \
    --checkpoint checkpoints/supervised.pt \
    --out checkpoints/rl_final.pt \
    --iterations 30 \
    --games-per-iter 200 \
    --mcts-sims 50
```

> ⚠ GPU-recommended. Much slower than `train_rl_vs_minimax.py` (50 NN forward passes per move).

---

## Step 4 — Export to ONNX

Converts the PyTorch checkpoint to an ONNX model for browser inference.

```bash
python export_onnx.py \
    --checkpoint checkpoints/rl_final.pt \
    --out ../public/models/renju_policy.onnx
```

Add `--quantize` to apply INT8 dynamic quantization and reduce the model from ~7 MB to ~2 MB (slight quality tradeoff):

```bash
python export_onnx.py \
    --checkpoint checkpoints/rl_final.pt \
    --out ../public/models/renju_policy.onnx \
    --quantize
```

The script verifies the exported model with `onnxruntime` before finishing.

---

## Quick Start (small test run)

```bash
# Fast end-to-end test (low quality, just for validating the pipeline)
python generate_data.py --games 200 --max-depth 2
python train_supervised.py --data data/games.npz --epochs 10 --batch 64
python train_rl_vs_minimax.py --checkpoint checkpoints/supervised.pt \
       --out checkpoints/rl_vs_minimax.pt --updates 50 --games-per-update 8
python export_onnx.py --checkpoint checkpoints/rl_vs_minimax.pt \
       --out ../public/models/renju_policy.onnx
```

---

## Model Architecture

```
Input (1, 3, 15, 15)
        ↓
Conv2d(3→64, 3×3) + BN + ReLU
        ↓
6 × ResBlock(64ch)
    [Conv(64→64, 3×3) + BN + ReLU + Conv(64→64, 3×3) + BN + skip]
        ↓
    ┌───┴──────────┐
Policy Head      Value Head
Conv(64→2, 1×1)  Conv(64→1, 1×1)
BN + ReLU        BN + ReLU
Flatten          Flatten
Linear(450→225)  Linear(225→64) + ReLU
                 Linear(64→1) + Tanh
```

**Input planes:**
- Channel 0: current player's stones (1 = stone present)
- Channel 1: opponent's stones
- Channel 2: side-to-move indicator (1.0 = Black to move, 0.0 = White)

**Outputs:**
- `policy`: 225-dim raw logits (apply softmax; illegal moves are masked in `nnai.js`)
- `value`: scalar in [-1, 1] (+1 = win for current player)

---

## Files

| File | Purpose |
|---|---|
| `game_engine.py` | Python port of the Renju rules + minimax AI |
| `generate_data.py` | Self-play data generation → `.npz` |
| `model.py` | PyTorch `RenjuNet` definition |
| `train_supervised.py` | Phase 1: supervised imitation learning |
| `train_rl.py` | Phase 2: MCTS self-play RL fine-tuning |
| `export_onnx.py` | Export `.pt` checkpoint → `.onnx` |
| `requirements.txt` | Python dependencies |

---

## Training Against a Human Player

Play games against the Neural AI in the browser, then fine-tune the models on your winning moves.

### Step 1 — Play and record

1. Open the Renju blog and select **🧠 Neural AI** as your opponent
2. Play games normally — every completed game is recorded automatically
3. After winning some games, click **📥 Export N games for training** in the side panel
4. Save the downloaded `renju_human_games_TIMESTAMP.json`

### Step 2 — Fine-tune

```bash
cd src/renju/train
python train_human.py \
    --games renju_human_games_TIMESTAMP.json \
    --black-checkpoint checkpoints/black_best.pt \
    --white-checkpoint checkpoints/white_best.pt \
    --out-black ../public/models/renju_black.onnx \
    --out-white ../public/models/renju_white.onnx
```

### Step 3 — Deploy

```bash
cd ../../..   # back to project root
npm run deploy
```

The updated models are now live. Play again — the model has learned from your games.

### How many games do you need?

**20–30 focused wins** targeting the same 2–3 weaknesses is enough for visible adaptation.
The model trains with `--lr 5e-5` (low) and `--mix-ratio 0.3` (30% original data mixed in)
to prevent forgetting existing knowledge while absorbing your specific patterns.

| Games won | Expected effect |
|---|---|
| 5–10 | Minimal visible change |
| 20–30 | Model starts defending the patterns you exploit |
| 50+ | Robust adaptation to your play style |
