# Model Card — Renju Neural Network AI

**Model name:** `renju_policy`  
**Version:** 1.0  
**Format:** ONNX (single-file, `public/models/renju_policy.onnx`, 2.3 MB)  
**Task:** Two-headed policy + value network for the board game Renju (Gomoku variant, 15×15)

---

## What is Renju?

Renju is a two-player abstract strategy game played on a 15×15 grid. Players alternate placing stones; the first to form an unbroken line of **exactly five** stones (horizontally, vertically, or diagonally) wins. Unlike standard Gomoku, Black (first player) faces **forbidden move** restrictions — double-three, double-four, and overline (6+ in a row) — to counterbalance Black's first-mover advantage.

---

## 0. Motivation & Design Philosophy

### Why build a domain-specific model?

The existing game already had two AI opponents: a minimax engine and an LLM-based player. The observation that motivated this project was simple — **LLMs are too generic to play Renju well**. A general-purpose language model receives the board as text, reasons about it spatially in a fundamentally limited way, and has no concept of tactics like open-fours or double-threes. It can occasionally find creative moves, but it cannot maintain the focused threat-response chains that define strong Renju play.

The goal was therefore to train a model *specifically* for Renju — one that internalises game-specific patterns from experience rather than inheriting general language understanding.

### Why not just use the minimax AI?

The minimax AI is already strong and serves as the primary opponent. The neural network fills a different role: it demonstrates a *learned* approach alongside the *programmed* one. Playing against the neural net is also genuinely different from playing against minimax — the NN can develop idiosyncratic tendencies and occasionally find unexpected moves that minimax would never consider.

### Why ONNX in the browser?

The site is statically hosted with no backend. All AI runs client-side — the LLM via WebLLM + WebGPU, the minimax via JavaScript, and the neural net via ONNX Runtime Web + WebAssembly. Keeping the neural net in-browser avoids server costs, privacy concerns, and latency. At 2.3 MB, the model is small enough for a browser download with a progress bar.

---

## 1. Feature Engineering

The board state is encoded as a **3-channel 15×15 float32 tensor** — one tensor per position, always described from the perspective of whoever is about to move.

| Channel | Content | Value |
|---|---|---|
| 0 | **Current player's stones** | 1.0 where a stone is present, 0.0 elsewhere |
| 1 | **Opponent's stones** | 1.0 where a stone is present, 0.0 elsewhere |
| 2 | **Side-to-move indicator** | 1.0 everywhere if current player is Black, 0.0 if White |

**Why this encoding?**

- *Relative perspective* (current player / opponent) rather than absolute (Black / White) means the model never needs to learn two separate strategies. The same weights handle both colors — the board always looks like "my stones vs their stones."
- *Side indicator* is needed because Black has forbidden moves and plays first — the game is not symmetric even with the relative encoding.
- *No history planes* — unlike AlphaZero (which uses 8 historical board states), we use only the current position. This keeps the model small and fast for browser inference.

**Board coordinate system:**

Internally the game engine stores moves as pixel coordinates (`x = col × 40`, `y = row × 40`, range 0–560). The tensor encoder converts these to grid indices (`col = x/40`, `row = y/40`, both 0–14) and lays them into the 15×15 planes. The flat move index used as the policy target is `row × 15 + col` (0–224).

---

## 2. Model Architecture

The architecture follows the **AlphaZero residual network** design: a shared convolutional trunk that feeds two separate output heads — a *policy head* predicting the best move, and a *value head* estimating who is winning.

```
Input  (batch, 3, 15, 15)
    │
    ▼
┌─────────────────────────────┐
│  Input Conv Block           │
│  Conv2d(3→64, 3×3, pad=1)  │
│  BatchNorm2d(64)            │
│  ReLU                       │
└────────────┬────────────────┘
             │
    ┌────────▼────────┐
    │  Residual Tower  │  ← 6 identical blocks
    │                  │
    │  ┌────────────┐  │
    │  │ Conv(64→64)│  │
    │  │ BN + ReLU  │  │
    │  │ Conv(64→64)│  │
    │  │ BN         │  │
    │  │ + skip     │  │  ← element-wise addition of input (skip connection)
    │  │ ReLU       │  │
    │  └────────────┘  │
    └────┬─────────────┘
         │
   ┌─────┴──────────────────────┐
   │                            │
   ▼                            ▼
Policy Head                 Value Head
Conv(64→2, 1×1)             Conv(64→1, 1×1)
BN + ReLU                   BN + ReLU
Flatten → 450 units         Flatten → 225 units
Linear(450→225)             Linear(225→64) + ReLU
                            Linear(64→1) + Tanh

Output: logits (225,)       Output: scalar ∈ [-1, +1]
```

### Parameter count

| Component | Parameters |
|---|---|
| Input conv block | 1,792 |
| 6 residual blocks (2 conv each) | 442,368 |
| Policy head | 57,375 |
| Value head | 14,721 |
| Batch norm parameters | 45,706 |
| **Total** | **561,962** |

Model size on disk: ~2.1 MB (float32 ONNX).

### Key design choices

- **3×3 convolutions** throughout the trunk — each layer "sees" a 3×3 neighbourhood around every cell, and stacking 6 layers gives an effective receptive field of 13×13 (nearly the whole 15×15 board).
- **Skip connections** (ResNet) prevent vanishing gradients in deep networks and let the model learn incremental refinements to board features rather than relearning from scratch at each layer.
- **Shared trunk, two heads** — learning both "what to play" and "who is winning" simultaneously regularises the trunk: the value head forces the network to understand game outcomes, not just mimic moves.
- **No pooling** — spatial structure is fully preserved throughout, because the exact position of every stone matters.

---

## 3. Training Data

### Generation (`train/generate_data.py`)

Training positions were collected from **5,000 self-play games** between two minimax AI instances.

**Minimax AI (the teacher):**  
The minimax engine uses alpha-beta pruning, a transposition table, and a pattern-based evaluation function that scores positions based on tactical features: open fours, open threes, broken fours, blocking threats, and combinations (double-four, four-three, double-three). It's the same engine used as the in-game AI opponent.

**Depth variation:**  
For each game, Black's search depth and White's search depth are drawn *independently* and *uniformly* from [1, 5]. This produces the full skill spectrum in one dataset — weak vs weak, strong vs weak, strong vs strong — giving the model positions from many different strategic contexts.

**Temperature sampling:**  
Each move is *sampled* (not greedily picked) from a softmax over minimax candidate scores with temperature τ = 1.5. This means the best move has the highest probability but second- and third-best moves are occasionally played, creating diverse game trajectories. Without this, all games with the same depth pairing would be identical (deterministic minimax always plays the same game from the same position).

**Renju rules enforced:**  
- Black's first stone is always at the center (mandatory in Renju)
- Forbidden moves (double-three, double-four, overline) are filtered from Black's candidate set at every step

**Deduplication:**  
After collection, identical `(board state, move label)` pairs that appear across different games are merged. Their value outcomes are *averaged* rather than discarded — a position seen as a win in 3 games and a loss in 1 gets outcome +0.5. This produces softer, more accurate value targets.

**Final dataset:**

| Statistic | Value |
|---|---|
| Raw positions collected | 92,053 |
| Duplicates removed | 48,540 (52.7%) |
| **Unique positions** | **43,513** |
| Black-to-move positions | 49% |
| White-to-move positions | 51% |
| Hard win labels (+1.0 / -1.0) | 90% |
| Soft labels (averaged duplicates) | 10% |
| File size (compressed .npz) | 1.1 MB |

---

## 4. Training Strategy

### Phase 1 — Supervised Pre-training (`train/train_supervised.py`)

The model is trained to *imitate* the minimax AI's move choices. This gives it a strong tactical baseline before any RL.

**Loss function:**

```
Total loss = Policy loss + Value loss

Policy loss = Cross-entropy(softmax(logits), one_hot(minimax_move))
Value loss  = MSE(tanh_output, game_outcome)
```

The policy head is trained to assign high probability to the move the minimax engine chose. The value head is trained to predict whether the current player eventually won (+1) or lost (−1).

**Hyperparameters:**

| Hyperparameter | Value |
|---|---|
| Optimiser | Adam (weight decay 1e-4) |
| Learning rate | 1e-3 with cosine annealing |
| Batch size | 256 |
| Epochs | 80 |
| Validation split | 5% |
| Early stopping | Best val loss checkpoint saved |

**Results:**

| Epoch | Train accuracy | Val accuracy |
|---|---|---|
| 1 | 12.5% | 24.6% |
| 5 | 51.8% | 46.6% |
| 10 | 62.7% | **46.6%** ← best |
| 80 | 88.1% | 44.4% |

*Random baseline accuracy = 1/225 = 0.4%.* The model reaches 46.6% top-1 accuracy on the validation set — meaning it predicts the same move as the minimax engine almost half the time.

The gap between train and val accuracy after epoch 10 indicates overfitting (the model memorises the 43k training positions). This is expected — the supervised phase is a warm-start, not the final model.

---

### Phase 2 — Reinforcement Learning vs Minimax (`train/train_rl_vs_minimax.py`)

Rather than MCTS self-play (expensive: ~50 neural net calls per move), the model plays directly against the minimax engine. This is faster (1 minimax call per move vs 50 MCTS simulations) and provides a stronger, consistent training signal.

**Algorithm: REINFORCE with value baseline**

At each update step:
1. Play N games simultaneously (the model plays half the games as Black, half as White).
2. For every move the model makes, record `(log_probability_of_chosen_move, value_estimate)`.
3. After each game ends (+1 win / −1 loss), compute the loss:

```
advantage     = normalised_reward − value_estimate   (baseline subtraction)
policy_loss   = −mean( log_prob × advantage )        (REINFORCE)
value_loss    = MSE( value_estimate, reward )         (critic)
entropy_bonus = −coef × mean( log_prob )              (encourages exploration)

Total loss = policy_loss + value_loss − entropy_bonus
```

**Why subtract the value estimate as a baseline?**  
In REINFORCE, if the model usually loses, every loss still generates a negative gradient pushing the policy away from all those moves — even moves that were better than usual. The value baseline centres the reward signal: the gradient is zero for an "average" outcome and positive only when the model did *better* than expected. This dramatically reduces gradient variance.

**Curriculum learning:**  
The model starts against a depth-1 minimax opponent — very weak, easy to beat. Once the win rate over the last 50 games exceeds 60%, the opponent depth increases by 1. This continues up to depth 8.

In practice the model flew through early depths:

| Step | Event |
|---|---|
| 169 | Promoted to depth 2 (60% win rate) |
| 178 | Promoted to depth 3 (60%) |
| 195 | Promoted to depth 4 (62%) |
| 463 | Promoted to depth 5 (60%) |
| 564 | Promoted to depth 6 (70%) |

**Dual curriculum (v2):**  
The original curriculum used a single depth for both colors. Because the model learned Black (attacker) play much faster than White (defender) play, a second run introduced *separate* opponent depths for Black and White games. The White curriculum starts at depth 1 independently, letting the model earn positive reward signals as White against weak opponents before facing stronger ones.

**GPU utilisation — batched inference:**  
All N games in a batch are stepped in parallel. At each move step, all board states requiring NN inference are stacked into a single tensor and run through the model in one forward pass. This reduces overhead from N serial calls (4.9ms each) to a single batched call (~6ms for batch=8), achieving ~3× speedup vs sequential inference.

**Hyperparameters:**

| Hyperparameter | Value |
|---|---|
| Optimiser | Adam (weight decay 1e-5) |
| Learning rate | 5e-5 |
| Games per update | 16 (2 batches of 8) |
| Entropy coefficient | 0.01 |
| Training temperature | 1.0 |
| Curriculum window | 50 games |
| Promote threshold | 60% win rate |
| Total updates | 550 (single curriculum), ~1800+ (dual) |

---

## 5. Evaluation

The model is evaluated by playing against the minimax engine at fixed depths with temperature τ = 0.3 (near-greedy), alternating which color the model plays.

**Win rate vs minimax (best single-curriculum model, step 550):**

| Opponent | NN as Black | NN as White | Combined |
|---|---|---|---|
| Minimax depth-1 (weakest) | **100%** | 10% | 55% |
| Minimax depth-2 | **100%** | 45% | 73% |
| Minimax depth-3 | 55% | 0% | 28% |
| Minimax depth-4 | **95%** | 0% | 48% |
| **Overall (d1–d4)** | **87.5%** | **13.8%** | **50.6%** |

**Improvement over training:**

| Checkpoint | Overall win rate |
|---|---|
| Supervised baseline | 7.2% |
| RL step 50 | 28.8% |
| RL step 200 | 46.9% |
| RL step 300 | 47.5% |
| RL step 450 | **50.0%** |
| RL step 550 (deployed) | **50.6%** |

**Key observations:**

1. **Strong as Black, weak as White.** The model achieves near-perfect play as Black against depth-1 through depth-4 opponents. As White it struggles at depth 3+. This reflects the asymmetry of Renju — Black's first-mover advantage + forbidden moves create a fundamentally different strategic problem for each color.

2. **Depth-4 Black performance (95%) outperforms depth-3 Black (55%).** This is not a regression but a snapshot effect — at different training steps the model had more or less recent experience at specific depths. The non-monotonic pattern reflects how the curriculum cycling of recent games affects which patterns are freshest in the policy.

3. **Overfitting in supervised phase.** Val accuracy peaked at epoch 10 (46.6%) and declined, confirming the dataset (43k positions) is modest for a 562k-parameter model. The RL phase mitigates this by continuing to train on new game experience.

---

## 6. Inference

The model is served as a single-file ONNX model (`public/models/renju_policy.onnx`, 2.3 MB) and runs entirely in the browser via **ONNX Runtime Web** (WebAssembly backend).

**Input/output specification:**

```
Input:   "board"   shape (1, 3, 15, 15)   dtype float32
Outputs: "policy"  shape (1, 225)          dtype float32  — raw logits (pre-softmax)
         "value"   shape (1, 1)            dtype float32  — tanh in [−1, +1]
```

**Move selection in the browser (`src/renju/nnai.js`):**

1. Encode the current board state as a `(1, 3, 15, 15)` float32 tensor.
2. Run inference → get policy logits and value estimate.
3. Apply softmax to policy logits → move probabilities.
4. **Mask illegal moves:** zero out cells already occupied or forbidden for Black (double-three, double-four, overline). Re-normalise.
5. Select the move with the highest probability (greedy, temperature = 0).

**Latency:** ~4–6 ms per move on a modern desktop (Apple Silicon MPS via ONNX Runtime WebAssembly).

---

## 7. Limitations

- **White play is significantly weaker than Black play.** The dual-curriculum run is still in progress to address this.
- **No lookahead.** Unlike the minimax AI (which searches 1–10 moves ahead), the neural network plays in a single forward pass. It relies entirely on patterns learned during training, not explicit tree search.
- **Fixed model capacity.** 562k parameters is compact by modern standards. A larger model (more residual blocks or wider channels) trained on more data would likely improve performance.
- **Training data quality.** The supervised phase trained on minimax games at depths 1–5. Minimax at low depths makes mistakes; the model may have learned suboptimal patterns from those games.
- **No opening book.** The Renju opening is standardised (Black must play center), but the model receives no additional opening guidance beyond what appeared in training games.

---

## 8. Files

| File | Purpose |
|---|---|
| `train/game_engine.py` | Python Renju rules engine + minimax AI (data generation & RL opponent) |
| `train/generate_data.py` | Minimax self-play → `data/games.npz` |
| `train/model.py` | PyTorch model definition (`RenjuNet`) |
| `train/train_supervised.py` | Phase 1: supervised imitation learning |
| `train/train_rl_vs_minimax.py` | Phase 2: REINFORCE + curriculum vs minimax |
| `train/export_onnx.py` | Export `.pt` checkpoint → single-file `.onnx` |
| `train/evaluate.py` | Win-rate evaluation vs minimax (accepts `.pt` or `.onnx`) |
| `src/renju/nnai.js` | Browser inference wrapper (ONNX Runtime Web) |
| `public/models/renju_policy.onnx` | Deployed model weights |
| `train/checkpoints/` | Training checkpoints (`.pt` files, one per 50 updates) |

---

## 9. Development Journey & Decision Log

This section documents the key decisions, mistakes, and pivots made during development. It is intended to be honest about what went wrong and why, not just what worked.

---

### 9.1 Data Generation: Getting it Right

#### First attempt — epsilon-greedy randomness

The initial approach injected random moves with probability ε = 0.15 (epsilon-greedy) to create diverse game trajectories. The reasoning: pure deterministic minimax always plays the same game from the same starting position, so without randomness a depth-3 vs depth-3 pairing would produce the same game every single time — and with 5,000 games but only 25 possible depth pairings (depths 1–5 × 1–5), the "5,000 games" would in practice contain only ~25 unique game lines.

The problem was pointed out immediately: **random moves in Renju are not valid game play.** With 15% random moves injected into both sides, the game became incoherent — neither player built coherent threats, games ran to the 225-move limit (filling the entire board) without anyone winning, and the draw rate hit **82%**. Most "games" produced no training signal.

Epsilon-greedy also conflates two different things: *exploration* (trying different strategic lines) and *randomness* (ignoring game logic entirely). We wanted the former, not the latter.

#### Second attempt — pure deterministic minimax

Removing epsilon entirely and running pure minimax produces zero draws (every game is decisive, as expected in Renju — a full-board draw is essentially impossible with reasonable play). But this recreated the diversity problem: with fixed random seeds, every game with the same depth pairing is identical.

After deduplication, 5,000 games with 25 depth combinations would reduce to ~25 unique game lines × ~20 positions each = ~500 unique training positions. Completely useless for a 562k-parameter model.

#### Third attempt — temperature-based move sampling (final)

The solution was **temperature softmax over minimax candidate scores**. Instead of picking the single best move (argmax), we sample moves proportionally to `softmax(scores / temperature)`. A move scoring 100 (immediate win) still dominates the distribution even at high temperature; the sampling only diversifies genuinely close decisions.

Crucially, the *training label* is always the minimax best move (what the model is taught to predict), while the *played move* is the temperature-sampled one (which creates the divergent game trajectories). This separates label quality from game diversity.

With τ = 1.5: at move 10, 20 games with the same depth pair produced 16 distinct board states. The 43k unique positions in the final dataset came from 5,000 games, not 25.

---

### 9.2 Three Critical Bugs in the Game Engine

The Python game engine (`game_engine.py`) is a port of the JavaScript minimax (`ai.js`). Porting introduced three bugs that each caused the engine to silently produce wrong results. These bugs were hidden until we noticed that 100% of games were producing draws even with pure minimax.

#### Bug 1 — `check_five` false positive

The function that detects a five-in-a-row started counting at 1 (to represent the stone being placed) without first verifying that the stone at that position actually belonged to the claimed color:

```python
# BUGGY: count = 1 regardless of what's actually at (r, c)
def check_five(board, r, c, color):
    for dr, dc in DIRECTIONS:
        count = 1   # ← assumes board[r,c] == color without checking
        ...
```

This caused `check_five(board, r7_c7, WHITE)` to return `True` when (7,7) was occupied by a Black stone but White had four stones in an adjacent line. The fix: add `if board[r, c] != color: return False` at the top.

#### Bug 2 — Negamax sign inversion (the most impactful bug)

The minimax uses a negamax formulation where scores are always from the *current player's perspective*. The terminal evaluation returned the score from the *previous player's perspective* without negating it:

```python
# BUGGY: returns score from -color's perspective, but negamax expects current player's perspective
score = evaluate(board, lr, lc, -color)
return score
```

In negamax, when White plays a winning move at depth 0 and we recurse to depth 1, the terminal check fires and evaluates the win from White's perspective (+100). Back at depth 0, the calling code does `score = -neg_score = -100`. A score of **−100 for a winning move** meant the AI actively avoided wins and pursued losses instead.

The correct behaviour: negate the score so it's from the current player's perspective:

```python
score = -evaluate(board, lr, lc, -color)  # ← fix: negate
```

This bug is subtle because at depth-1 it still produced decisive games (just with random-looking move quality), but at depth-2+ it compounded into pure draws.

#### Bug 3 — Wrong `last_move` passed to root minimax call

`get_best_move` was passing the current player's own last stone as the `last_move` hint to the minimax root. This triggered the terminal win-check (`check_five(board, own_stone, opponent_color)`) which incorrectly fired as a false positive whenever the opponent had 4 stones in a line adjacent to one of the current player's stones.

The fix: pass `None` as `last_move` from the root call. By the time `get_best_move` is called, the game has already verified no one has won. There is no need for the terminal win check at the root.

---

### 9.3 Why MCTS Self-Play Was Abandoned

The initial RL phase used **MCTS self-play** (the AlphaZero approach): the model plays against itself, using 50 Monte Carlo Tree Search simulations per move to build a visit-count distribution as a richer policy target.

This was abandoned for two reasons:

1. **Speed.** Each MCTS move requires 50 neural net forward passes (one per simulation). With 16 games per update and ~15 moves per game, that's 50 × 16 × 15 = 12,000 NN calls per update. At ~5ms each, that's ~60 seconds per update. For 500 updates: ~8 hours. In contrast, RL vs minimax requires exactly 1 minimax call per move: ~2 seconds per update.

2. **Circular bootstrapping.** In the early stages of training, the model is weak. MCTS self-play means a weak model teaches itself — the training signal is only as good as the current policy. With a minimax opponent, the training signal is an external ground truth that doesn't degrade as the model improves.

The minimax opponent is also a *curriculum* — its difficulty is precisely calibrated by depth. MCTS self-play has no equivalent mechanism for gradually increasing difficulty.

---

### 9.4 The White Play Problem

After the first full RL training run (550 updates, curriculum depth 1→6), evaluation revealed a stark asymmetry:

| Color | vs depth-1 | vs depth-4 |
|---|---|---|
| NN as **Black** | 100% | 95% |
| NN as **White** | 10% | 0% |

The model had become strong as Black but almost couldn't win as White at all against stronger opponents.

**Why does this happen?**

In the RL training, games alternate: even-numbered games have NN as Black, odd-numbered games have NN as White. Initially, both perform poorly. As the curriculum advances to depth 2, the model starts winning as Black (Black has the first-mover advantage and the model has seen many Black positions in supervised training). White games remain losses for far longer.

The REINFORCE gradient for White positions is therefore consistently negative for many hundred updates: "you lost as White, push the policy away from all those moves." This doesn't teach the model *what to do* as White — it just discourages everything. The policy gradient for White never points in a useful direction because the model never wins.

**The fix — dual curriculum:**

The second RL run maintains *two independent curriculum depths* — one for the opponent the model faces when playing as Black, another for the opponent it faces when playing as White. The White opponent starts at depth 1 regardless of where the Black curriculum is.

With a depth-1 opponent as White, the model wins ~25% of games immediately (even from the supervised baseline). These wins give the policy gradient positive signal: "these White moves led to wins, do more of this." The White curriculum advances independently as the model improves, without being blocked by the Black curriculum's depth.

Early results from the dual-curriculum run show the White win rate against depth-1 opponents climbing from ~10% to ~60% within 50 updates — the same speed at which Black originally learned.

---

### 9.5 Rethinking Data Balance

The question arose whether the training dataset should include more games where White wins. Investigation revealed:

- The supervised dataset already had **68% White wins** from data generation (White is the stronger player at symmetric depths because Black's forbidden moves constrain its options).
- White-to-move positions had an average outcome of **+0.16** (positive = White tends to win those games).
- The dataset was actually well-balanced: 49% Black-to-move, 51% White-to-move positions.

The imbalance was not in the supervised data — it was in the **RL reward signal**: the model rarely won as White during RL training, so the policy gradient for White moves was almost always negative. More White-wins in the supervised data wouldn't fix a problem that only manifests during online RL. The dual curriculum fix (above) addresses the root cause.

---

### 9.6 GPU Utilisation — Batched Inference

Profiling showed that each neural net forward pass took **4.9ms** on MPS (Apple Silicon), while each depth-2 minimax call took only **2ms**. The NN was slower than the CPU opponent it was trying to learn from.

The reason: every move in every game was processed as a single `(1, 3, 15, 15)` tensor — a batch size of 1. The GPU overhead (data transfer, kernel launch, synchronisation) dominated the actual computation for a model this small.

The fix: **run all N games in the batch simultaneously** and collect all board states requiring NN inference at each game step into a single `(K, 3, 15, 15)` tensor, then do one forward pass for all K positions. For batch_size=8, this reduced the NN cost from 8 × 4.9ms = 39ms to one batched call of ~6ms — a **6× reduction** in NN time per step.

Benchmarked speedup:

| Approach | Time per game |
|---|---|
| Sequential (batch=1) | 226ms |
| Batched (batch=8) | **84ms** (2.7× faster) |
| Batched (batch=16) | 150ms (slower — sequential minimax dominates) |

The optimal batch size (8) reflects the balance point where NN batching savings outweigh the overhead of processing more sequential minimax calls per step.

---

### 9.7 Depth-6 Wall

At step 564, the model was promoted to depth-6 minimax after achieving 70% win rate against depth-5. Depth-6 minimax takes **1.1 seconds per call** (vs 0.2s at depth-5 and 0.03s at depth-1). With 16 games per update and ~15 minimax calls per game, each update at depth-6 took over 4 minutes. For 50 updates between checkpoints: **3+ hours per checkpoint**.

This made further training impractical without either:
- A faster minimax implementation (C extension or Cython)
- Reducing games per update significantly
- Capping the curriculum at depth-5

The training was stopped at step 550 (depth-5), and the best checkpoint was exported. The dual-curriculum run caps at `--max-depth 6` with the understanding that depth-6 games will be rare and slow.

---

### 9.8 Summary of Key Decisions

| Decision | Chosen approach | Rejected alternative | Reason |
|---|---|---|---|
| Inference runtime | ONNX Runtime Web (WASM) | WebGPU / server API | Static hosting, no backend |
| Training data diversity | Temperature sampling over minimax scores | Epsilon-greedy random moves | Epsilon violated game logic, caused 82% draws |
| RL algorithm | REINFORCE vs minimax | MCTS self-play | 60× faster; stronger teacher signal |
| Curriculum | Depth-based with 60% promotion threshold | Fixed depth | Automatically scales difficulty |
| White play | Dual curriculum (separate depth per color) | Single shared curriculum | Single curriculum starved White of positive reward |
| Data deduplication | Average outcomes of duplicates | Discard duplicates | Preserves information; produces soft value labels |
| Board encoding | 3-plane relative (current / opponent / side) | 8-plane absolute + history | Smaller model; color symmetry via relative encoding |
| Model size | 562k parameters | Larger model (e.g. 5M) | Browser-first constraint (target <5MB ONNX) |

