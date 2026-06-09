#!/usr/bin/env python3
"""
gym_server.py — Web-based Human RL Gym for Renju.

Starts a local server at http://localhost:5001
Human plays the NN in the browser; REINFORCE updates run after every N games.

Usage:
    python3 gym_server.py --checkpoint checkpoints/black_expert_v2.pt \\
                           --color black --update-every 4
"""

import argparse, os, sys, threading
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, request, jsonify

from model import RenjuNet
from game_engine import (
    BOARD_SIZE, BLACK, WHITE, EMPTY,
    empty_board, check_five, board_to_tensor,
    find_forced_move, get_candidate_moves,
)

# ── HTML page (embedded) ───────────────────────────────────────────────────────
HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Renju RL Gym</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #16213e; color: #e0e0e0;
    font-family: 'Segoe UI', system-ui, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 24px 16px; min-height: 100vh; gap: 14px;
  }
  h1 { font-size: 1.35rem; color: #7ecbff; letter-spacing: 1px; }
  .stats-bar {
    display: flex; gap: 18px; font-size: 0.82rem; color: #888;
    background: #1e2a45; padding: 8px 20px; border-radius: 8px;
    flex-wrap: wrap; justify-content: center;
  }
  .stats-bar span { color: #e0e0e0; font-weight: 600; }
  #board-wrap { position: relative; user-select: none; }
  canvas { display: block; border-radius: 4px; cursor: crosshair; }
  .controls {
    display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
    justify-content: center;
  }
  button {
    background: #1e2a45; color: #e0e0e0; border: 1px solid #3a4a6a;
    padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.88rem;
    transition: background 0.15s, border-color 0.15s;
  }
  button:hover { background: #2a3a5a; border-color: #7ecbff; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  select {
    background: #1e2a45; color: #e0e0e0; border: 1px solid #3a4a6a;
    padding: 8px 12px; border-radius: 6px; font-size: 0.88rem; cursor: pointer;
  }
  label { font-size: 0.82rem; color: #888; }
  #status {
    font-size: 0.95rem; min-height: 1.4em; text-align: center;
    color: #7ecbff; padding: 0 8px;
  }
  #status.win  { color: #4ade80; font-weight: 700; }
  #status.lose { color: #f87171; font-weight: 600; }
  #status.draw { color: #facc15; }
  #status.warn { color: #fb923c; }
  .train-flash {
    font-size: 0.75rem; background: #0f2b1f; color: #4ade80;
    border: 1px solid #4ade80; border-radius: 4px;
    padding: 3px 10px; opacity: 0; transition: opacity 0.3s;
  }
  .train-flash.show { opacity: 1; }
</style>
</head>
<body>
<h1>Renju RL Gym</h1>

<div class="stats-bar">
  <div>Games <span id="s-games">0</span></div>
  <div>NN Wins <span id="s-wins">0</span></div>
  <div>You Win <span id="s-losses">0</span></div>
  <div>Draws <span id="s-draws">0</span></div>
  <div>Updates <span id="s-updates">0</span></div>
  <div>NN plays <span id="s-nncolor">●</span></div>
</div>

<div id="board-wrap">
  <canvas id="board" width="640" height="640"></canvas>
</div>

<div class="controls">
  <label>You play as</label>
  <select id="sel-color">
    <option value="white">White ○</option>
    <option value="black">Black ●</option>
  </select>
  <button id="btn-new">New Game</button>
  <span class="train-flash" id="train-flash">▲ Model updated</span>
</div>

<div id="status">Press "New Game" to start.</div>

<script>
const N = 15, CELL = 40, PAD = 30;
const W = PAD * 2 + (N - 1) * CELL;
const COLS = 'ABCDEFGHJKLMNOP';

const canvas  = document.getElementById('board');
const ctx     = canvas.getContext('2d');
const statusEl = document.getElementById('status');

let boardState = null;   // 2D array [row][col]: 0=empty, 1=black, -1=white
let lastMove   = null;   // [row, col]
let gameActive = false;
let myTurn     = false;
let hoverCell  = null;   // [row, col] for ghost stone
let myColor    = 'white'; // 'black' or 'white'

// ── Render ─────────────────────────────────────────────────────────────────────
function drawBoard() {
  // Wood background
  ctx.fillStyle = '#c8a86a';
  ctx.fillRect(0, 0, W, W);

  // Subtle wood grain
  ctx.strokeStyle = 'rgba(120,70,20,0.07)';
  for (let i = 0; i < W; i += 8) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, W); ctx.stroke();
  }

  // Grid lines
  ctx.strokeStyle = '#7a4f1e';
  ctx.lineWidth = 1;
  for (let i = 0; i < N; i++) {
    const x = PAD + i * CELL, y = PAD + i * CELL;
    ctx.beginPath(); ctx.moveTo(x, PAD); ctx.lineTo(x, PAD + (N-1)*CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(PAD + (N-1)*CELL, y); ctx.stroke();
  }

  // Thick border lines
  ctx.strokeStyle = '#5a3a10';
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD, PAD, (N-1)*CELL, (N-1)*CELL);

  // Star points (standard Renju positions)
  const stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
  ctx.fillStyle = '#5a3a10';
  for (const [r, c] of stars) {
    ctx.beginPath();
    ctx.arc(PAD + c*CELL, PAD + r*CELL, 3.5, 0, Math.PI*2);
    ctx.fill();
  }

  // Column labels
  ctx.fillStyle = '#4a2e0a';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < N; i++) {
    const x = PAD + i*CELL;
    ctx.fillText(COLS[i], x, PAD - 15);
    ctx.fillText(COLS[i], x, PAD + (N-1)*CELL + 15);
  }
  // Row labels
  ctx.textAlign = 'right';
  for (let i = 0; i < N; i++) {
    const y = PAD + i*CELL;
    ctx.fillText(i+1, PAD - 8, y);
  }
  ctx.textAlign = 'left';
  for (let i = 0; i < N; i++) {
    const y = PAD + i*CELL;
    ctx.fillText(i+1, PAD + (N-1)*CELL + 8, y);
  }
}

function drawStone(r, c, color, isLast, ghost) {
  const cx = PAD + c*CELL, cy = PAD + r*CELL, rad = CELL/2 - 3;
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.35;

  // Stone gradient
  const grad = ctx.createRadialGradient(cx - rad*0.3, cy - rad*0.3, rad*0.05, cx, cy, rad);
  if (color === 'black') {
    grad.addColorStop(0, '#555'); grad.addColorStop(1, '#0a0a0a');
  } else {
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#cccccc');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = color === 'black' ? '#333' : '#aaa';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Last move marker
  if (isLast && !ghost) {
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI*2);
    ctx.fillStyle = color === 'black' ? '#7ecbff' : '#e05050';
    ctx.fill();
  }
  ctx.restore();
}

function render() {
  drawBoard();
  if (!boardState) return;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = boardState[r][c];
      if (v !== 0) {
        const isLast = lastMove && lastMove[0]===r && lastMove[1]===c;
        drawStone(r, c, v===1 ? 'black' : 'white', isLast, false);
      }
    }
  }
  // Ghost stone on hover
  if (hoverCell && myTurn && gameActive) {
    const [r, c] = hoverCell;
    if (boardState[r][c] === 0) {
      drawStone(r, c, myColor, false, true);
    }
  }
}

// ── Event helpers ─────────────────────────────────────────────────────────────
function canvasCell(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W / rect.width, scaleY = W / rect.height;
  const px = (e.clientX - rect.left) * scaleX;
  const py = (e.clientY - rect.top)  * scaleY;
  const c = Math.round((px - PAD) / CELL);
  const r = Math.round((py - PAD) / CELL);
  if (r >= 0 && r < N && c >= 0 && c < N) return [r, c];
  return null;
}

canvas.addEventListener('mousemove', e => {
  const cell = canvasCell(e);
  if (!cell || !myTurn || !gameActive) { hoverCell = null; render(); return; }
  const [r, c] = cell;
  if (!boardState || boardState[r][c] !== 0) { hoverCell = null; render(); return; }
  if (!hoverCell || hoverCell[0]!==r || hoverCell[1]!==c) {
    hoverCell = cell; render();
  }
});

canvas.addEventListener('mouseleave', () => { hoverCell = null; render(); });

canvas.addEventListener('click', async e => {
  if (!gameActive || !myTurn) return;
  const cell = canvasCell(e);
  if (!cell) return;
  const [r, c] = cell;
  if (!boardState || boardState[r][c] !== 0) return;

  myTurn = false; hoverCell = null;
  setStatus('NN is thinking…', '');
  render();

  const res  = await fetch('/api/move', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({row: r, col: c})
  });
  const data = await res.json();
  if (data.error) { setStatus(data.error, 'warn'); myTurn = true; return; }
  applyResponse(data);
});

// ── API calls ─────────────────────────────────────────────────────────────────
document.getElementById('btn-new').addEventListener('click', newGame);

async function newGame() {
  myColor = document.getElementById('sel-color').value;
  const res  = await fetch('/api/new_game', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({human_color: myColor})
  });
  const data = await res.json();
  gameActive = true;
  boardState = data.board;
  lastMove   = data.last_move;
  hoverCell  = null;
  document.getElementById('s-nncolor').textContent = data.nn_color==='black' ? '●' : '○';
  updateStats(data.stats);
  render();

  if (data.your_turn) {
    myTurn = true;
    setStatus('Your turn.', '');
  } else {
    myTurn = false;
    setStatus('NN is thinking…', '');
    // Trigger NN's opening move
    const res2 = await fetch('/api/nn_move', { method: 'POST' });
    const d2   = await res2.json();
    boardState = d2.board; lastMove = d2.last_move;
    render();
    myTurn = true;
    setStatus('Your turn.', '');
  }
}

function applyResponse(data) {
  boardState = data.board;
  lastMove   = data.last_move;
  render();

  if (data.training_update) {
    flashTraining();
    updateStats(data.stats);
  }

  if (data.game_over) {
    gameActive = false;
    updateStats(data.stats);
    if      (data.winner === 'human') setStatus('You win! 🎉', 'win');
    else if (data.winner === 'nn')    setStatus('NN wins.', 'lose');
    else                              setStatus('Draw.', 'draw');
    return;
  }

  updateStats(data.stats);
  myTurn = true;
  if (data.nn_missed_forced)
    setStatus('Your turn. (NN missed a forced move!)', 'warn');
  else
    setStatus('Your turn.', '');
}

function setStatus(msg, cls) {
  statusEl.textContent = msg;
  statusEl.className = cls;
}

function updateStats(s) {
  if (!s) return;
  document.getElementById('s-games').textContent   = s.games;
  document.getElementById('s-wins').textContent    = s.wins;
  document.getElementById('s-losses').textContent  = s.losses;
  document.getElementById('s-draws').textContent   = s.draws;
  document.getElementById('s-updates').textContent = s.updates;
}

function flashTraining() {
  const el = document.getElementById('train-flash');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// Initial board
drawBoard();
fetch('/api/stats').then(r=>r.json()).then(updateStats).catch(()=>{});
</script>
</body>
</html>
"""


# ── REINFORCE loss ─────────────────────────────────────────────────────────────
def reinforce_loss(lps, vals, rewards, base_outcomes, entropy_coef, device):
    if not lps:
        return None
    r_t  = torch.tensor(rewards,       dtype=torch.float32, device=device)
    bo_t = torch.tensor(base_outcomes, dtype=torch.float32, device=device)
    v_t  = torch.stack(vals)
    lp_t = torch.stack(lps)
    rn   = (r_t - r_t.mean()) / (r_t.std() + 1e-8) if r_t.std() > 1e-6 else r_t
    policy  = -(lp_t * (rn - v_t.detach())).mean()
    value   = nn.functional.mse_loss(v_t, bo_t)
    entropy = -entropy_coef * lp_t.mean()
    return policy + value + entropy


# ── NN move (with gradient graph retained) ────────────────────────────────────
def nn_pick_move(model, board, is_black, temperature, device, tactical_penalty):
    """Returns (move, log_prob_tensor, value_tensor, missed_forced_bool)."""
    tensor = board_to_tensor(board, is_black)
    x = torch.tensor(tensor, dtype=torch.float32, device=device).unsqueeze(0)

    model.eval()  # correct BN behaviour for batch_size=1
    logits, val = model(x)   # NO torch.no_grad() — we need the computation graph
    model.train()

    logits = logits[0]
    value  = val[0, 0]       # scalar tensor, keeps grad

    candidates = get_candidate_moves(board, is_black)
    mask = torch.full((BOARD_SIZE * BOARD_SIZE,), float('-inf'), device=device)
    for r, c in candidates:
        if board[r, c] == EMPTY:
            mask[r * BOARD_SIZE + c] = 0.0
    if (mask == float('-inf')).all():  # fallback
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if board[r, c] == EMPTY:
                    mask[r * BOARD_SIZE + c] = 0.0

    temp  = max(temperature, 1e-3)
    probs = torch.softmax((logits + mask) / temp, dim=0)
    dist  = torch.distributions.Categorical(probs)
    idx   = dist.sample()
    lp    = dist.log_prob(idx)
    move  = (idx.item() // BOARD_SIZE, idx.item() % BOARD_SIZE)

    missed_forced = False
    if tactical_penalty > 0:
        forced = find_forced_move(board, is_black, candidates)
        if forced is not None and forced != move:
            missed_forced = True

    return move, lp, value, missed_forced


# ── Server state ───────────────────────────────────────────────────────────────
class State:
    def __init__(self):
        self.lock        = threading.Lock()
        self.model       = None
        self.optimizer   = None
        self.device      = None
        self.args        = None
        self.board       = None
        self.is_black    = True    # whose turn it is
        self.human_color = WHITE
        self.nn_color    = BLACK
        self.last_move   = None
        self.trajectory  = []     # current game: list of [lp, val, step_r]
        self.game_over   = True
        self.buffer      = []     # completed trajectories waiting for update
        self.stats       = {'games': 0, 'wins': 0, 'losses': 0,
                            'draws': 0, 'updates': 0}

    def board_as_list(self):
        return self.board.tolist() if self.board is not None else None


S = State()
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return HTML


@app.route('/api/stats')
def api_stats():
    with S.lock:
        return jsonify(S.stats)


@app.route('/api/new_game', methods=['POST'])
def api_new_game():
    data = request.get_json(silent=True) or {}
    human_color_str = data.get('human_color', 'white')

    with S.lock:
        S.board      = empty_board()
        S.last_move  = (BOARD_SIZE // 2, BOARD_SIZE // 2)
        S.board[S.last_move] = BLACK   # Black always opens at center (Renju rule)
        S.human_color = WHITE if human_color_str == 'white' else BLACK
        S.nn_color    = BLACK if S.human_color == WHITE else WHITE
        # After center placement it's White's turn
        S.is_black    = False
        S.trajectory  = []
        S.game_over   = False
        your_turn     = (S.human_color == WHITE)  # human is White → they go next

        return jsonify({
            'board':      S.board_as_list(),
            'last_move':  list(S.last_move),
            'your_turn':  your_turn,
            'nn_color':   'black' if S.nn_color == BLACK else 'white',
            'stats':      S.stats,
        })


@app.route('/api/nn_move', methods=['POST'])
def api_nn_move():
    """Trigger one NN move (used when NN goes first after center is placed)."""
    with S.lock:
        if S.game_over:
            return jsonify({'error': 'No active game.'}), 400

        board    = S.board
        is_black = S.is_black
        move, lp, val, missed = nn_pick_move(
            S.model, board, is_black,
            S.args.temperature, S.device, S.args.tactical_penalty
        )
        board[move[0], move[1]] = BLACK if is_black else WHITE
        S.last_move = move
        S.is_black  = not is_black

        step_r = -S.args.tactical_penalty if missed else 0.0
        S.trajectory.append([lp, val, step_r])

        return jsonify({
            'board':     S.board_as_list(),
            'last_move': list(move),
        })


@app.route('/api/move', methods=['POST'])
def api_move():
    """Human plays a move; server responds with NN's reply."""
    data = request.get_json(silent=True) or {}
    hr, hc = int(data.get('row', -1)), int(data.get('col', -1))

    with S.lock:
        if S.game_over:
            return jsonify({'error': 'No active game.'}), 400
        if not (0 <= hr < BOARD_SIZE and 0 <= hc < BOARD_SIZE):
            return jsonify({'error': 'Invalid coordinates.'}), 400
        if S.board[hr, hc] != EMPTY:
            return jsonify({'error': 'Cell occupied.'}), 400

        human_color = BLACK if S.is_black else WHITE
        S.board[hr, hc] = human_color
        S.last_move = (hr, hc)
        S.is_black  = not S.is_black

        # Check if human won
        if check_five(S.board, hr, hc, human_color):
            return _end_game('human')

        if _board_full():
            return _end_game('draw')

        # NN responds
        nn_is_black = S.is_black
        move, lp, val, missed = nn_pick_move(
            S.model, S.board, nn_is_black,
            S.args.temperature, S.device, S.args.tactical_penalty
        )
        nn_color = BLACK if nn_is_black else WHITE
        S.board[move[0], move[1]] = nn_color
        S.last_move = move
        S.is_black  = not nn_is_black

        step_r = -S.args.tactical_penalty if missed else 0.0
        S.trajectory.append([lp, val, step_r])

        # Check if NN won
        if check_five(S.board, move[0], move[1], nn_color):
            return _end_game('nn')

        if _board_full():
            return _end_game('draw')

        return jsonify({
            'board':             S.board_as_list(),
            'last_move':         list(move),
            'nn_missed_forced':  missed,
            'game_over':         False,
            'training_update':   False,
            'stats':             S.stats,
        })


def _board_full():
    return int((S.board != EMPTY).sum()) >= BOARD_SIZE * BOARD_SIZE


def _end_game(winner):
    """Finalize game, optionally run REINFORCE update. Must be called under S.lock."""
    S.game_over = True
    args = S.args

    if winner == 'nn':
        nn_outcome = 1.0
        S.stats['wins'] += 1
    elif winner == 'human':
        nn_outcome = -1.0
        S.stats['losses'] += 1
    else:
        nn_outcome = 0.0
        S.stats['draws'] += 1
    S.stats['games'] += 1

    # Back-fill base outcome for all NN moves this game
    complete_traj = [(lp, val, step_r, nn_outcome) for lp, val, step_r in S.trajectory]
    S.trajectory = []

    training_update = False
    if not args.no_train and complete_traj:
        S.buffer.append(complete_traj)
        if len(S.buffer) >= args.update_every:
            lps, vals, rewards, bases = [], [], [], []
            for traj in S.buffer:
                for lp, val, step_r, base_o in traj:
                    lps.append(lp)
                    vals.append(val)
                    rewards.append(base_o + step_r)
                    bases.append(base_o)

            loss = reinforce_loss(lps, vals, rewards, bases,
                                  args.entropy_coef, S.device)
            if loss is not None:
                S.optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(S.model.parameters(), 1.0)
                S.optimizer.step()

            S.buffer.clear()
            S.stats['updates'] += 1
            training_update = True
            _save_checkpoint()
            print(f"  ↑ Update {S.stats['updates']}  "
                  f"W{S.stats['wins']}/L{S.stats['losses']}/D{S.stats['draws']}")

    return jsonify({
        'board':            S.board_as_list(),
        'last_move':        list(S.last_move) if S.last_move else None,
        'game_over':        True,
        'winner':           winner,
        'training_update':  training_update,
        'stats':            S.stats,
    })


def _save_checkpoint():
    torch.save({
        'update':               S.stats['updates'],
        'model_state_dict':     S.model.state_dict(),
        'optimizer_state_dict': S.optimizer.state_dict(),
        'human_gym_stats':      S.stats,
    }, S.args.out)


# ── CLI ────────────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(description='Web-based Human RL Gym for Renju')
    p.add_argument('--checkpoint',       type=str,   default='checkpoints/black_expert_v2.pt')
    p.add_argument('--out',              type=str,   default=None,
                   help='Output checkpoint (defaults to overwriting --checkpoint)')
    p.add_argument('--color',            type=str,   default='black',
                   choices=['black', 'white'],
                   help='Color the NN plays by default (user can override in UI)')
    p.add_argument('--update-every',     type=int,   default=4)
    p.add_argument('--lr',               type=float, default=1e-5)
    p.add_argument('--temperature',      type=float, default=0.5)
    p.add_argument('--tactical-penalty', type=float, default=0.5)
    p.add_argument('--entropy-coef',     type=float, default=0.01)
    p.add_argument('--no-train',         action='store_true')
    p.add_argument('--port',             type=int,   default=5001)
    p.add_argument('--blocks',           type=int,   default=6)
    p.add_argument('--channels',         type=int,   default=64)
    return p.parse_args()


def main():
    args = parse_args()
    args.out = args.out or args.checkpoint

    device = (
        torch.device('mps')  if torch.backends.mps.is_available() else
        torch.device('cuda') if torch.cuda.is_available() else
        torch.device('cpu')
    )

    model = RenjuNet(num_blocks=args.blocks, channels=args.channels).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    if os.path.exists(args.checkpoint):
        ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
        model.load_state_dict(ckpt['model_state_dict'])
        if not args.no_train and 'optimizer_state_dict' in ckpt:
            try:
                optimizer.load_state_dict(ckpt['optimizer_state_dict'])
            except Exception:
                pass
        if 'human_gym_stats' in ckpt:
            loaded = ckpt['human_gym_stats']
            # Merge with defaults so missing keys (e.g. 'games' from older checkpoints) are filled
            defaults = {'games': 0, 'wins': 0, 'losses': 0, 'draws': 0, 'updates': 0}
            S.stats = {**defaults, **loaded}
        print(f"  Loaded: {args.checkpoint}")
    else:
        print(f"  Checkpoint not found: {args.checkpoint}", file=sys.stderr)
        sys.exit(1)

    S.model     = model
    S.optimizer = optimizer
    S.device    = device
    S.args      = args

    mode = "no training" if args.no_train else f"train every {args.update_every} games"
    print(f"  NN plays: {args.color}  |  {mode}  |  device: {device}")
    print(f"\n  Open http://localhost:{args.port} in your browser\n")

    app.run(host='127.0.0.1', port=args.port, debug=False, threaded=False)


if __name__ == '__main__':
    main()
