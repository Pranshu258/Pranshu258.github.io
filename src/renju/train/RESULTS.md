# Renju NN Training Results

All tournament results tracked here. Each run: 50 games/side, temp=0.3, round-robin.

---

## Tournament 1 — 2026-06-09
**Models:** supervised, black_expert, white_expert, black_expert_v2, white_expert_v2_best (now white_expert_v2), self_play_v1  
**Notes:** First model-vs-model eval; minimax evals had saturated. self_play_v1 = symmetric self-play from black_expert_v2, 10 iter × 50 games, 25 MCTS sims. Bugs fixed before this run: model.eval() during self-play, candidate-restricted MCTS priors.

| Rank | Model                | Elo    | As Black | As White | Overall |
|------|----------------------|--------|----------|----------|---------|
| 1    | white_expert_v2      | 1703.1 | 66.8%    | 68.4%    | 67.6%   |
| 2    | black_expert_v2      | 1677.3 | 73.2%    | 70.0%    | 71.6%   |
| 3    | black_expert         | 1443.8 | 44.8%    | 35.2%    | 40.0%   |
| 4    | self_play_v1         | 1409.4 | 43.6%    | 44.0%    | 43.8%   |
| 5    | white_expert         | 1396.1 | 38.4%    | 38.8%    | 38.6%   |
| 6    | supervised           | 1370.3 | 48.8%    | 28.0%    | 38.4%   |

**Key findings:**
- v2 specialists are dominant (~200 Elo gap over v1)
- symmetric self_play_v1 did not beat specialists — same pool as v1 models
- Elo 1500 baseline is relative to this pool

---

## Tournament 2 — 2026-06-09
**Models:** supervised, black_expert, white_expert, black_expert_v2, white_expert_v2, self_play_v1, self_play_black_v1, self_play_white_v1  
**Notes:** Added specialist self-play v1. Both specialist models **regressed** vs their start points (15-22% win rate vs base). Root cause: opponent too strong → value head learns "I always lose" → policy collapses. Value loss → ~0 but policy loss still high.

| Rank | Model              | Elo    | As Black | As White | Overall |
|------|--------------------|--------|----------|----------|---------|
| 1    | black_expert_v2    | 1648.4 | 79.4%    | 73.4%    | 76.4%   |
| 2    | white_expert_v2    | 1643.8 | 71.7%    | 69.7%    | 70.7%   |
| 3    | black_expert       | 1592.6 | 53.4%    | 46.0%    | 49.7%   |
| 4    | self_play_white_v1 | 1449.8 | 39.4%    | 33.4%    | 36.4%   |
| 5    | supervised         | 1444.4 | 46.9%    | 35.4%    | 41.1%   |
| 6    | white_expert       | 1437.6 | 45.4%    | 42.9%    | 44.1%   |
| 7    | self_play_black_v1 | 1399.9 | 44.3%    | 28.9%    | 36.6%   |
| 8    | self_play_v1       | 1383.5 | 49.1%    | 40.6%    | 44.9%   |

**Head-to-head highlights:**
- black_expert_v2 vs white_expert_v2: 55% (nearly equal, effectively tied)
- self_play_black_v1 vs black_expert_v2 (its start): 15% ← catastrophic regression
- self_play_white_v1 vs white_expert_v2 (its start): 22% ← same problem

**Root cause of regression:** opponent too strong relative to trainable model → value head converges to -1 (always predicts loss) → policy collapses. Value loss hitting ~0 is a red flag, not a success.

---

## Tournament 3 — 2026-06-09
**Models:** supervised, black_expert_v2, white_expert_v2, self_play_v1, self_play_black_v1, self_play_white_v1, self_play_black_v2, self_play_white_v2  
**Notes:** v2 symmetric self-play (aug+Dirichlet, 20 iter×100 games, 50 sims) **catastrophically regressed** (1113/1099 Elo). Root cause: `steps = buffer/batch = ~390` gradient steps/iter — far too many, completely overwrites learned policy. v2 loses 95%+ vs its own starting checkpoint.

| Rank | Model               | Elo    | As Black | As White | Overall |
|------|---------------------|--------|----------|----------|---------|
| 1    | white_expert_v2     | 1836.0 | 84.0%    | 78.3%    | 81.1%   |
| 2    | black_expert_v2     | 1830.5 | 83.4%    | 76.9%    | 80.1%   |
| 3    | self_play_v1        | 1569.1 | 63.4%    | 44.6%    | 54.0%   |
| 4    | supervised          | 1549.8 | 54.9%    | 40.6%    | 47.7%   |
| 5    | self_play_black_v1  | 1518.6 | 55.4%    | 43.4%    | 49.4%   |
| 6    | self_play_white_v1  | 1483.2 | 61.4%    | 47.1%    | 54.3%   |
| 7    | self_play_black_v2  | 1113.4 | 17.7%    | 14.6%    | 16.1%   |
| 8    | self_play_white_v2  | 1099.3 | 21.7%    | 12.6%    | 17.1%   |

**Lessons learned:**
- Too many gradient steps/iter (390) destroys the policy — must cap at ~100
- Augmentation (8× data) amplified the instability — each game → 8× more gradient signal
- White's value loss → 0.000 from iter 9: value head overfit to "Black always wins" (first-move advantage in symmetric self-play)
- **Missing critical piece: evaluation gate** — AlphaZero's core safeguard: only accept new weights if they beat previous checkpoint >55%

---

## Tournament 4 — 2026-06-09
**Models:** black_expert_v2, white_expert_v2, self_play_black_v3, self_play_white_v3  
**Notes:** Eval gate prevented catastrophic regression. self_play_black_v3 (only 2/20 accepted) actually BEATS both base models in H2H (52% each). self_play_white_v3 (9/20 accepted) regressed as White (28% vs white_expert_v2) — symmetric self-play hurts White due to Black first-move advantage.

| Rank | Model               | Elo    | As Black | As White | Overall |
|------|---------------------|--------|----------|----------|---------|
| 1    | white_expert_v2     | 1661.7 | 44.0%    | 68.7%    | 56.3%   |
| 2    | black_expert_v2     | 1512.7 | 51.3%    | 56.0%    | 53.7%   |
| 3    | self_play_white_v3  | 1417.1 | 30.0%    | 36.0%    | 33.0%   |
| 4    | self_play_black_v3  | 1408.5 | 60.0%    | 54.0%    | 57.0%   |

**H2H highlights:**
- self_play_black_v3 vs black_expert_v2: **52%** ← slight improvement despite only 2 accepted iters
- self_play_black_v3 vs white_expert_v2: **52%** ← also beats white
- self_play_white_v3 vs white_expert_v2: 28% ← regression from symmetric self-play

**Key insight:** Elo is misleading in small pools. Overall win rate (57% for self_play_black_v3) is more informative. The eval gate works — it prevented collapse while allowing incremental gains.

---

## Tournament 5 — 2026-06-09
**Models:** black_expert_v2, white_expert_v2, self_play_black_v3, self_play_black_v4, self_play_white_v3  
**Notes:** Black v4 (curriculum weak→strong, 9/20 accepted) **regressed** (25% vs base). Root cause: training against weak `self_play_white_v3` first caused the model to overfit to exploiting weaknesses that don't exist in stronger opponents. `self_play_black_v3` remains best Black.

| Rank | Model               | Elo    | As Black | As White | Overall |
|------|---------------------|--------|----------|----------|---------|
| 1    | white_expert_v2     | 1685.4 | 59.0%    | 66.5%    | 62.7%   |
| 2    | black_expert_v2     | 1607.3 | 60.0%    | 58.0%    | 59.0%   |
| 3    | self_play_black_v3  | 1461.0 | 63.0%    | 50.5%    | 56.8%   |
| 4    | self_play_white_v3  | 1410.2 | 35.5%    | 34.5%    | 35.0%   |
| 5    | self_play_black_v4  | 1336.2 | 50.5%    | 22.5%    | 36.5%   |

**Lessons learned:**
- Curriculum on a **too-weak** opponent backfires: model learns to exploit opponent-specific weaknesses
- `self_play_black_v3` (2/20 accepted, symmetric self-play) > `self_play_black_v4` (9/20, curriculum on weak)
- **Best Black**: `self_play_black_v3` ≈ `black_expert_v2` (within noise)
- **Best White**: `white_expert_v2` (clearly dominant, especially as White 66.5%)
- We may be approaching an architecture ceiling — 6 blocks × 64 channels

---

## Cumulative best checkpoints
| Role  | Best checkpoint       | Notes                                    |
|-------|-----------------------|------------------------------------------|
| Black | `self_play_black_v3`  | 56.8% overall, ~52% vs both base models |
| White | `white_expert_v2`     | 62.7% overall, 66.5% as White            |

---

## Planned Runs

### v5 (running now)
- **self_play_white_v5**: specialist White vs opponent pool `[self_play_black_v3, black_expert_v2]`
  - **`--warmup-games 100`** (pre-fills buffer → ensures ≥20 grad steps from iter 1)
  - **min 20 gradient steps** per iter (fixed from v4's 1-step bug)
  - Same eval gate, lr 1e-5, 30 eval games
