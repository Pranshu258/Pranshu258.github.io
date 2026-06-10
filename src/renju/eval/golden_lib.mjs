import { checkWinRenju, isForbiddenMove } from '../ai.js';

export const BOARD_CELLS = 15;
export const GRID_SIZE = 40;
export const COL_LABELS = 'ABCDEFGHIJKLMNO';
export const SCHEMA_VERSION = 1;

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export const CATEGORIES = [
  'immediate_win',
  'forced_block',
  'broken_four_win',
  'open_four_creation',
  'four_three_fork',
  'white_overline_win',
  'false_positive_forbidden',
  'overline_forbidden',
  'double_three_forbidden',
  'double_four_forbidden',
];

export function createRng(seed) {
  let value = seed >>> 0;
  return function rng() {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseArgs(argv, defaults = {}) {
  const args = { ...defaults };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function toNotation([col, row]) {
  return `${COL_LABELS[col]}${row + 1}`;
}

export function fromNotation(notation) {
  const match = String(notation).match(/^([A-O])(\d{1,2})$/);
  if (!match) return null;
  const col = COL_LABELS.indexOf(match[1]);
  const row = Number(match[2]) - 1;
  if (!isCell([col, row])) return null;
  return [col, row];
}

export function toPixel([col, row]) {
  return [col * GRID_SIZE, row * GRID_SIZE];
}

export function pixelToNotation(move) {
  if (!move) return null;
  return toNotation([move[0] / GRID_SIZE, move[1] / GRID_SIZE]);
}

export function notationListToPixels(list) {
  return list.map(fromNotation).map(toPixel);
}

export function isCell([col, row]) {
  return Number.isInteger(col) && Number.isInteger(row) &&
    col >= 0 && col < BOARD_CELLS && row >= 0 && row < BOARD_CELLS;
}

export function cellKey(cell) {
  return `${cell[0]},${cell[1]}`;
}

export function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const bSet = new Set(b);
  return a.every(item => bSet.has(item));
}

export function canonicalBoardHash(sample) {
  const black = [...sample.black].sort();
  const white = [...sample.white].sort();
  return JSON.stringify([sample.side_to_move, black, white, sample.category]);
}

export function sampleLinePlacement(rng, relCells) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const dirA = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
    const dirB = [-dirA[1], dirA[0]];
    const base = [
      Math.floor(rng() * BOARD_CELLS),
      Math.floor(rng() * BOARD_CELLS),
    ];
    const cells = relCells.map(([u, v]) => [
      base[0] + u * dirA[0] + v * dirB[0],
      base[1] + u * dirA[1] + v * dirB[1],
    ]);
    if (cells.every(isCell)) return cells;
  }
  throw new Error('Unable to place line template on board');
}

export function sampleCrossPlacement(rng, relCells) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const dirA = DIRECTIONS[Math.floor(rng() * DIRECTIONS.length)];
    const orthogonal = DIRECTIONS.filter(([dc, dr]) => dc * dirA[0] + dr * dirA[1] === 0);
    const dirB = orthogonal[Math.floor(rng() * orthogonal.length)] ?? [-dirA[1], dirA[0]];
    const base = [
      3 + Math.floor(rng() * (BOARD_CELLS - 6)),
      3 + Math.floor(rng() * (BOARD_CELLS - 6)),
    ];
    const cells = relCells.map(([u, v]) => [
      base[0] + u * dirA[0] + v * dirB[0],
      base[1] + u * dirA[1] + v * dirB[1],
    ]);
    if (cells.every(isCell)) return cells;
  }
  throw new Error('Unable to place cross template on board');
}

export function immediateWinningMoves(sample, side) {
  const own = side === 'black' ? sample.black : sample.white;
  const opp = side === 'black' ? sample.white : sample.black;
  const occupied = new Set([...sample.black, ...sample.white]);
  const ownPixels = notationListToPixels(own);
  const oppPixels = notationListToPixels(opp);
  const moves = [];

  for (let row = 0; row < BOARD_CELLS; row += 1) {
    for (let col = 0; col < BOARD_CELLS; col += 1) {
      const notation = toNotation([col, row]);
      if (occupied.has(notation)) continue;
      const move = toPixel([col, row]);
      if (side === 'black' && isForbiddenMove(ownPixels, oppPixels, move, true).forbidden) {
        continue;
      }

      if (checkWinRenju([...ownPixels, move], move[0], move[1], side === 'black')) {
        moves.push(notation);
      }
    }
  }

  return moves.sort();
}

function lineStatsAfterMove(sample, side, moveNotation) {
  const own = side === 'black' ? sample.black : sample.white;
  const opp = side === 'black' ? sample.white : sample.black;
  const ownSet = new Set([...own, moveNotation]);
  const oppSet = new Set(opp);
  const move = fromNotation(moveNotation);
  const stats = [];

  for (const [dc, dr] of DIRECTIONS) {
    let count = 1;
    let openEnds = 0;

    for (const sign of [1, -1]) {
      for (let step = 1; step <= 5; step += 1) {
        const cell = [move[0] + sign * step * dc, move[1] + sign * step * dr];
        if (!isCell(cell)) break;
        const notation = toNotation(cell);
        if (ownSet.has(notation)) {
          count += 1;
          continue;
        }
        if (!oppSet.has(notation)) openEnds += 1;
        break;
      }
    }

    stats.push({ count, openEnds });
  }

  return stats;
}

export function createsOpenFour(sample, side, moveNotation) {
  return lineStatsAfterMove(sample, side, moveNotation)
    .some(({ count, openEnds }) => count === 4 && openEnds === 2);
}

export function createsOpenThree(sample, side, moveNotation) {
  return lineStatsAfterMove(sample, side, moveNotation)
    .some(({ count, openEnds }) => count === 3 && openEnds === 2);
}

export function createsFourThreeFork(sample, side, moveNotation) {
  const stats = lineStatsAfterMove(sample, side, moveNotation);
  return stats.some(({ count, openEnds }) => count === 4 && openEnds >= 1) &&
    stats.some(({ count, openEnds }) => count === 3 && openEnds === 2);
}

export function forbiddenMoves(sample) {
  const blackPixels = notationListToPixels(sample.black);
  const whitePixels = notationListToPixels(sample.white);
  const occupied = new Set([...sample.black, ...sample.white]);
  const moves = [];

  for (let row = 0; row < BOARD_CELLS; row += 1) {
    for (let col = 0; col < BOARD_CELLS; col += 1) {
      const notation = toNotation([col, row]);
      if (occupied.has(notation)) continue;
      const move = toPixel([col, row]);
      const result = isForbiddenMove(blackPixels, whitePixels, move, true);
      if (result.forbidden) moves.push({ move: notation, reason: result.reason });
    }
  }

  return moves.sort((a, b) => a.move.localeCompare(b.move));
}

export function boardToTensor(playerMoves, opponentMoves, isBlack) {
  const size = BOARD_CELLS * BOARD_CELLS;
  const data = new Float32Array(3 * size);
  const plane0 = 0;
  const plane1 = size;
  const plane2 = size * 2;

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
  data.fill(isBlack ? 1 : 0, plane2, plane2 + size);

  return data;
}

export function indexToPixel(idx) {
  const row = Math.floor(idx / BOARD_CELLS);
  const col = idx % BOARD_CELLS;
  return [col * GRID_SIZE, row * GRID_SIZE];
}

export function pixelToIndex(x, y) {
  return (y / GRID_SIZE) * BOARD_CELLS + (x / GRID_SIZE);
}

export function getCandidateIndices(playerMoves, opponentMoves) {
  const allMoves = [...playerMoves, ...opponentMoves];
  if (allMoves.length === 0) return [Math.floor(BOARD_CELLS / 2) * BOARD_CELLS + Math.floor(BOARD_CELLS / 2)];

  const occupied = new Set(allMoves.map(([x, y]) => pixelToIndex(x, y)));
  const candidates = new Set();

  for (const [x, y] of allMoves) {
    const row = y / GRID_SIZE;
    const col = x / GRID_SIZE;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < BOARD_CELLS && nc >= 0 && nc < BOARD_CELLS) {
          const idx = nr * BOARD_CELLS + nc;
          if (!occupied.has(idx)) candidates.add(idx);
        }
      }
    }
  }

  return Array.from(candidates);
}

export function legalPolicyIndices(playerMoves, opponentMoves, isBlack, { excludeForbidden = true } = {}) {
  const occupied = new Set([...playerMoves, ...opponentMoves].map(([x, y]) => pixelToIndex(x, y)));
  return getCandidateIndices(playerMoves, opponentMoves).filter(idx => {
    if (occupied.has(idx)) return false;
    if (!excludeForbidden) return true;
    const move = indexToPixel(idx);
    return !isForbiddenMove(playerMoves, opponentMoves, move, isBlack).forbidden;
  });
}

export function validateSample(sample) {
  const errors = [];
  const required = ['id', 'category', 'side_to_move', 'black', 'white', 'best_moves', 'forbidden_moves', 'source'];
  for (const field of required) {
    if (!(field in sample)) errors.push(`missing field: ${field}`);
  }
  if (sample.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!CATEGORIES.includes(sample.category)) errors.push(`unknown category: ${sample.category}`);
  if (!['black', 'white'].includes(sample.side_to_move)) errors.push(`invalid side_to_move: ${sample.side_to_move}`);

  const allMoves = [...(sample.black ?? []), ...(sample.white ?? [])];
  const uniqueMoves = new Set(allMoves);
  if (uniqueMoves.size !== allMoves.length) errors.push('black and white stones overlap or duplicate');

  for (const notation of allMoves) {
    if (!fromNotation(notation)) errors.push(`invalid board coordinate: ${notation}`);
  }

  for (const notation of [...(sample.best_moves ?? []), ...(sample.forbidden_moves ?? []), ...(sample.avoid_moves ?? [])]) {
    if (!fromNotation(notation)) errors.push(`invalid label coordinate: ${notation}`);
    if (uniqueMoves.has(notation)) errors.push(`label points to occupied coordinate: ${notation}`);
  }

  if (sample.side_to_move === 'black' && sample.black.length !== sample.white.length) {
    errors.push(`black to move requires equal counts; got B=${sample.black.length}, W=${sample.white.length}`);
  }
  if (sample.side_to_move === 'white' && sample.black.length !== sample.white.length + 1) {
    errors.push(`white to move requires black one ahead; got B=${sample.black.length}, W=${sample.white.length}`);
  }

  const blackForbidden = forbiddenMoves(sample);
  const forbiddenSet = blackForbidden.map(item => item.move);
  if (sample.side_to_move === 'black' && !sameSet([...sample.forbidden_moves].sort(), forbiddenSet)) {
    errors.push(`forbidden_moves mismatch; expected [${forbiddenSet.join(', ')}]`);
  }
  if (sample.side_to_move === 'white' && sample.forbidden_moves.length > 0) {
    errors.push('white-to-move samples should not expose black forbidden moves as active labels');
  }

  if (['immediate_win', 'broken_four_win'].includes(sample.category)) {
    const wins = immediateWinningMoves(sample, sample.side_to_move);
    if (!sameSet([...sample.best_moves].sort(), wins)) {
      errors.push(`best_moves must match immediate wins; expected [${wins.join(', ')}]`);
    }
  }

  if (sample.category === 'white_overline_win') {
    if (sample.side_to_move !== 'white') errors.push('white_overline_win must be white to move');
    const wins = immediateWinningMoves(sample, 'white');
    if (!sameSet([...sample.best_moves].sort(), wins)) {
      errors.push(`white_overline_win best_moves must match white winning overlines; expected [${wins.join(', ')}]`);
    }
  }

  if (sample.category === 'open_four_creation') {
    for (const move of sample.best_moves) {
      if (!createsOpenFour(sample, sample.side_to_move, move)) {
        errors.push(`${move} does not create an open four`);
      }
    }
  }

  if (sample.category === 'four_three_fork') {
    for (const move of sample.best_moves) {
      if (!createsFourThreeFork(sample, sample.side_to_move, move)) {
        errors.push(`${move} does not create a four-three fork`);
      }
    }
  }

  if (sample.category === 'false_positive_forbidden') {
    if (sample.side_to_move !== 'black') errors.push('false_positive_forbidden must be black to move');
    const blackPixels = notationListToPixels(sample.black);
    const whitePixels = notationListToPixels(sample.white);
    for (const move of sample.best_moves) {
      const result = isForbiddenMove(blackPixels, whitePixels, toPixel(fromNotation(move)), true);
      if (result.forbidden) errors.push(`${move} should be legal but is forbidden as ${result.reason}`);
      if (!createsOpenThree(sample, 'black', move) && !createsOpenFour(sample, 'black', move)) {
        errors.push(`${move} should create a visible threat while remaining legal`);
      }
    }
  }

  if (sample.category === 'forced_block') {
    const opponent = sample.side_to_move === 'black' ? 'white' : 'black';
    const opponentWins = immediateWinningMoves(sample, opponent);
    if (!sameSet([...sample.best_moves].sort(), opponentWins)) {
      errors.push(`forced_block best_moves must match opponent winning threats; expected [${opponentWins.join(', ')}]`);
    }
  }

  if (sample.category.endsWith('_forbidden')) {
    if (sample.side_to_move !== 'black') errors.push('forbidden categories must be black to move');
    const expectedReason = sample.category.replace('_forbidden', '').replaceAll('_', '-');
    for (const notation of sample.forbidden_moves) {
      const result = blackForbidden.find(item => item.move === notation);
      if (!result) errors.push(`${notation} is not forbidden`);
      if (result && result.reason !== expectedReason) {
        errors.push(`${notation} forbidden reason should be ${expectedReason}; got ${result.reason}`);
      }
    }
  }

  return errors;
}

export function summarizeSamples(samples) {
  const byCategory = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  for (const sample of samples) byCategory[sample.category] = (byCategory[sample.category] ?? 0) + 1;
  return {
    schema_version: SCHEMA_VERSION,
    total: samples.length,
    by_category: byCategory,
  };
}
