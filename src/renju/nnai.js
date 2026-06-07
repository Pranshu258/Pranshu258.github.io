/**
 * nnai.js
 * In-browser Renju neural network AI using ONNX Runtime Web.
 *
 * The model accepts a (1, 3, 15, 15) float32 board tensor and returns:
 *   policy : (1, 225) raw logits → softmax → move probabilities
 *   value  : (1, 1)   tanh in [-1, 1]
 *
 * Board coordinate convention (matching ai.js):
 *   pixel coords: x = col * GRID_SIZE, y = row * GRID_SIZE   (0–560, GRID_SIZE=40)
 *   grid indices: col = x/40, row = y/40   (0–14)
 *   tensor index: row * 15 + col
 */

import { isForbiddenMove } from './ai';

const GRID_SIZE   = 40;
const BOARD_CELLS = 15;

// Separate specialist models: black expert and white expert
const MODEL_URL_BLACK = '/models/renju_black.onnx';
const MODEL_URL_WHITE = '/models/renju_white.onnx';

const _state = {
  black: { session: null, loading: false, error: null },
  white: { session: null, loading: false, error: null },
};

// ─── Model loading ────────────────────────────────────────────────────────────

/**
 * Load both expert models in parallel (lazy, cached).
 * Progress is split evenly: black = 0–0.5, white = 0.5–1.0.
 * @param {function} onProgress  optional callback (fraction 0–1)
 */
export async function loadModel(onProgress) {
  await Promise.all([
    _loadExpert('black', p => onProgress && onProgress(p * 0.5)),
    _loadExpert('white', p => onProgress && onProgress(0.5 + p * 0.5)),
  ]);
}

async function _loadExpert(color, onProgress) {
  const s = _state[color];
  if (s.session) return s.session;
  if (s.error)   throw s.error;
  if (s.loading) {
    // Wait until the ongoing load resolves
    await new Promise(resolve => {
      const poll = setInterval(() => {
        if (!s.loading) { clearInterval(poll); resolve(); }
      }, 50);
    });
    if (s.error) throw s.error;
    return s.session;
  }

  s.loading = true;
  try {
    const ort = await import('onnxruntime-web/wasm');
    ort.env.wasm.wasmPaths = '/';
    ort.env.wasm.numThreads = 1;

    const url = color === 'black' ? MODEL_URL_BLACK : MODEL_URL_WHITE;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${color} model: ${response.status} ${response.statusText}`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let received = 0;

    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (onProgress && total > 0) onProgress(received / total);
    }

    if (onProgress) onProgress(1);
    const modelBuffer = _concatBuffers(chunks);
    s.session = await ort.InferenceSession.create(modelBuffer, { executionProviders: ['wasm'] });
    s.loading = false;
    return s.session;
  } catch (err) {
    s.error   = err;
    s.loading = false;
    throw err;
  }
}

/** Returns true only when both expert models are loaded. */
export function isModelLoaded() {
  return _state.black.session !== null && _state.white.session !== null;
}

export function getModelLoadError() {
  return _state.black.error || _state.white.error;
}

/** Route to the correct expert session based on current player color. */
async function _getSession(isBlack) {
  const color = isBlack ? 'black' : 'white';
  const s = _state[color];
  if (s.session) return s.session;
  return _loadExpert(color);
}

// ─── Board encoding ───────────────────────────────────────────────────────────

/**
 * Convert the game's pixel-coordinate move arrays to a (3, 15, 15) Float32Array.
 * @param {Array<[number,number]>} playerMoves    current player's moves (pixel coords)
 * @param {Array<[number,number]>} opponentMoves  opponent's moves (pixel coords)
 * @param {boolean} isBlack                       whether current player is Black
 */
function boardToTensor(playerMoves, opponentMoves, isBlack) {
  const size  = BOARD_CELLS * BOARD_CELLS;
  const data  = new Float32Array(3 * size);
  const plane0 = 0;      // current player stones
  const plane1 = size;   // opponent stones
  const plane2 = size * 2; // side indicator

  for (const [x, y] of playerMoves) {
    const col = x / GRID_SIZE;
    const row = y / GRID_SIZE;
    data[plane0 + row * BOARD_CELLS + col] = 1;
  }
  for (const [x, y] of opponentMoves) {
    const col = x / GRID_SIZE;
    const row = y / GRID_SIZE;
    data[plane1 + row * BOARD_CELLS + col] = 1;
  }
  // Side indicator: all 1s if current player is Black
  data.fill(isBlack ? 1 : 0, plane2, plane2 + size);

  return data;
}

/**
 * Convert a flat tensor index (0–224) back to pixel coordinates.
 */
function indexToPixel(idx) {
  const row = Math.floor(idx / BOARD_CELLS);
  const col = idx % BOARD_CELLS;
  return [col * GRID_SIZE, row * GRID_SIZE];
}

/**
 * Convert pixel coordinates to tensor index.
 */
function pixelToIndex(x, y) {
  return (y / GRID_SIZE) * BOARD_CELLS + (x / GRID_SIZE);
}

// ─── Inference ────────────────────────────────────────────────────────────────

/**
 * Run neural net inference and return the best legal move.
 *
 * @param {Array<[number,number]>} playerMoves    current player's moves
 * @param {Array<[number,number]>} opponentMoves  opponent's moves
 * @param {boolean} isBlack  whether current player is Black (affects forbidden move rules)
 * @param {number}  temperature  > 0 to sample; 0 for greedy argmax (default 0)
 * @returns {Promise<[number,number]|null>}  best move as [x, y] pixel coords, or null
 */
export async function getNNMove(playerMoves, opponentMoves, isBlack, temperature = 0) {
  const session = await _getSession(isBlack);
  const ort = await import('onnxruntime-web/wasm');

  const tensorData = boardToTensor(playerMoves, opponentMoves, isBlack);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, BOARD_CELLS, BOARD_CELLS]);

  const results = await session.run({ board: inputTensor });
  const policyLogits = results.policy.data;   // Float32Array length 225
  const valuePred    = results.value.data[0]; // scalar

  // Build set of occupied cells
  const occupied = new Set();
  for (const [x, y] of [...playerMoves, ...opponentMoves]) {
    occupied.add(pixelToIndex(x, y));
  }

  // Softmax over legal (unoccupied, non-forbidden) positions
  const probs = softmax(policyLogits);
  const legalProbs = new Float32Array(225);
  for (let i = 0; i < 225; i++) {
    if (occupied.has(i)) continue;
    const [x, y] = indexToPixel(i);
    const { forbidden } = isForbiddenMove(playerMoves, opponentMoves, [x, y], isBlack);
    if (forbidden) continue;
    legalProbs[i] = probs[i];
  }

  // Renormalise
  const total = legalProbs.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  for (let i = 0; i < 225; i++) legalProbs[i] /= total;

  let chosenIdx;
  if (temperature === 0) {
    // Greedy
    chosenIdx = legalProbs.indexOf(Math.max(...legalProbs));
  } else {
    // Temperature sampling
    const adjusted = new Float32Array(225);
    for (let i = 0; i < 225; i++) {
      adjusted[i] = legalProbs[i] > 0 ? Math.pow(legalProbs[i], 1 / temperature) : 0;
    }
    const adjTotal = adjusted.reduce((a, b) => a + b, 0);
    let rand = Math.random() * adjTotal;
    chosenIdx = 224;
    for (let i = 0; i < 225; i++) {
      rand -= adjusted[i];
      if (rand <= 0) { chosenIdx = i; break; }
    }
  }

  return indexToPixel(chosenIdx);
}

/**
 * Evaluate a board position and return the value estimate for the current player.
 * @returns {Promise<number>} value in [-1, 1]
 */
export async function evaluatePosition(playerMoves, opponentMoves, isBlack) {
  const session = await _getSession(isBlack);
  const ort = await import('onnxruntime-web/wasm');

  const tensorData = boardToTensor(playerMoves, opponentMoves, isBlack);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, BOARD_CELLS, BOARD_CELLS]);
  const results = await session.run({ board: inputTensor });
  return results.value.data[0];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function softmax(logits) {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function _concatBuffers(chunks) {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}
