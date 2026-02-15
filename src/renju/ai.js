// AI Algorithm - Ported from algo.py
// Minimax with Alpha-Beta Pruning for Renju (Five in a Row)
// Optimized with Set-based lookups, transposition table, and consolidated patterns

const GRID_SIZE = 40;
const BOARD_MAX = 14 * GRID_SIZE; // 560 for 15x15 board
const MAX_CANDIDATE_MOVES = 10;

// Scores for evaluation
const SCORES = {
  WIN: 10,
  BLOCK_FOUR: 9,
  FOUR_OPEN: 8,
  FOUR_HALF: 7,
  BLOCK_THREE: 6,
  THREE_OPEN: 5,
  THREE_HALF: 4,
  TWO: 2,
  NONE: 0
};

// Direction vectors for pattern checking
const DIRECTIONS = [
  [1, 0],   // horizontal
  [0, 1],   // vertical
  [1, 1],   // diagonal SE
  [1, -1]   // diagonal NE
];

// 8-way neighbor offsets
const NEIGHBORS = [
  [0, -1], [1, -1], [1, 0], [1, 1],
  [0, 1], [-1, 1], [-1, 0], [-1, -1]
];

// Transposition table for caching evaluated positions
const transpositionTable = new Map();
const MAX_TABLE_SIZE = 100000;

// Helper: Create position key for Set lookup
function posKey(x, y) {
  return (x << 16) | (y & 0xFFFF); // Bit packing for faster hashing
}

// Helper: Create position Set from array
function createPosSet(positions) {
  const set = new Set();
  for (let i = 0; i < positions.length; i++) {
    set.add(posKey(positions[i][0], positions[i][1]));
  }
  return set;
}

// Helper: Check if position exists in Set
function hasPos(set, x, y) {
  return set.has(posKey(x, y));
}

// Helper: Generate hash for position (for transposition table)
function hashPosition(player1, player2) {
  const sorted1 = [...player1].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const sorted2 = [...player2].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return JSON.stringify([sorted1, sorted2]);
}

/**
 * Main attack function with alpha-beta pruning
 * Returns: { score, bestMove } - no longer mutates input arrays
 */
export function attack(player, otherPlayer, depth, maxDepth, alpha, beta) {
  // Check transposition table
  const hash = hashPosition(player, otherPlayer);
  const cached = transpositionTable.get(hash);
  if (cached && cached.depth >= maxDepth - depth) {
    return depth === 0 ? cached : cached.score;
  }

  const playerSet = createPosSet(player);
  
  if (isGameOverFast(playerSet, player) || depth === maxDepth) {
    const score = evaluateFast(player, otherPlayer);
    return depth === 0 ? { score, bestMove: null } : score;
  }

  let bestMove = null;
  let bestScore = -1000;
  const moves = getMovesOptimized(player, otherPlayer);

  for (const move of moves) {
    player.push(move); // Temporarily add move
    
    let score = attack(otherPlayer, player, depth + 1, maxDepth, -beta, -Math.max(alpha, bestScore));
    if (typeof score === 'object') score = score.score;
    score = -score;

    player.pop(); // Restore state

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
      if (bestScore >= beta) {
        break; // Beta cutoff
      }
    }
  }

  // Cache result
  if (transpositionTable.size < MAX_TABLE_SIZE) {
    transpositionTable.set(hash, { score: bestScore, depth: maxDepth - depth, bestMove });
  }

  return depth === 0 ? { score: bestScore, bestMove } : bestScore;
}

// Async version that reports candidates being considered
export async function attackWithVisualization(player, otherPlayer, maxDepth, onCandidateEvaluated) {
  const candidates = [];
  
  async function search(playerArr, otherArr, depth, alpha, beta) {
    const playerSet = createPosSet(playerArr);
    
    if (isGameOverFast(playerSet, playerArr) || depth === maxDepth) {
      return evaluateFast(playerArr, otherArr);
    }

    let bestMove = null;
    let bestScore = -1000;
    const moves = getMovesOptimized(playerArr, otherArr);

    for (const move of moves) {
      // At depth 0, report the candidate being evaluated
      if (depth === 0) {
        onCandidateEvaluated(move, 'evaluating');
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      playerArr.push(move);
      let score = await search(otherArr, playerArr, depth + 1, -beta, -Math.max(alpha, bestScore));
      score = -score;
      playerArr.pop();

      if (depth === 0) {
        candidates.push({ move, score });
        onCandidateEvaluated(move, 'evaluated', score);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
        if (bestScore >= beta) {
          break;
        }
      }
    }

    if (depth === 0 && bestMove) {
      playerArr.push(bestMove);
    }

    return bestScore;
  }

  await search([...player], [...otherPlayer], 0, -1000, 1000);
  return candidates;
}

// Optimized game over check using Set
function isGameOverFast(playerSet, player) {
  for (let i = 0; i < player.length; i++) {
    const [x, y] = player[i];
    
    for (const [dx, dy] of DIRECTIONS) {
      let count = 1;
      // Check in positive direction
      for (let n = 1; n <= 4; n++) {
        if (hasPos(playerSet, x + GRID_SIZE * n * dx, y + GRID_SIZE * n * dy)) {
          count++;
        } else break;
      }
      // Check in negative direction
      for (let n = 1; n <= 4; n++) {
        if (hasPos(playerSet, x - GRID_SIZE * n * dx, y - GRID_SIZE * n * dy)) {
          count++;
        } else break;
      }
      if (count >= 5) return true;
    }
  }
  return false;
}

// Optimized move generation with partial sorting
function getMovesOptimized(player1, player2) {
  const usedSet = createPosSet([...player1, ...player2]);
  const moveSet = new Set();
  const moves = [];

  // Generate candidate moves (neighbors of existing pieces)
  for (const [x, y] of [...player1, ...player2]) {
    for (const [dx, dy] of NEIGHBORS) {
      const nx = x + GRID_SIZE * dx;
      const ny = y + GRID_SIZE * dy;
      const key = posKey(nx, ny);
      
      if (!usedSet.has(key) && !moveSet.has(key) && 
          nx >= 0 && nx <= BOARD_MAX && ny >= 0 && ny <= BOARD_MAX) {
        moveSet.add(key);
        moves.push([nx, ny]);
      }
    }
  }

  // Quick score estimation for move ordering (avoid full evaluation)
  const scoredMoves = moves.map(move => ({
    move,
    score: quickEvaluate(player1, player2, move)
  }));

  // Partial sort: only get top N moves
  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves.slice(0, MAX_CANDIDATE_MOVES).map(sm => sm.move);
}

// Quick evaluation for move ordering (lighter than full evaluate)
function quickEvaluate(player, opponent, move) {
  const [mx, my] = move;
  const playerSet = createPosSet(player);
  const opponentSet = createPosSet(opponent);
  let score = 0;

  for (const [dx, dy] of DIRECTIONS) {
    let ownCount = 0;
    let oppCount = 0;
    let openEnds = 0;

    // Count own pieces and check openness
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) ownCount++;
      else if (!hasPos(opponentSet, px, py)) { openEnds++; break; }
      else break;
    }
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) ownCount++;
      else if (!hasPos(opponentSet, px, py)) { openEnds++; break; }
      else break;
    }

    // Count opponent pieces (for blocking)
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(opponentSet, px, py)) oppCount++;
      else break;
    }
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(opponentSet, px, py)) oppCount++;
      else break;
    }

    // Score based on potential
    if (ownCount >= 4) score += SCORES.WIN;
    else if (ownCount === 3 && openEnds === 2) score += SCORES.FOUR_OPEN;
    else if (ownCount === 3) score += SCORES.FOUR_HALF;
    else if (ownCount === 2 && openEnds === 2) score += SCORES.THREE_OPEN;
    else if (ownCount === 2) score += SCORES.THREE_HALF;
    else if (ownCount === 1) score += SCORES.TWO;

    // Blocking bonus
    if (oppCount >= 4) score += SCORES.BLOCK_FOUR;
    else if (oppCount === 3) score += SCORES.BLOCK_THREE;
  }

  return score;
}

// Full evaluation (kept for compatibility, uses optimized helpers)
export function evaluateFast(player1, player2) {
  if (player1.length === 0) return 0;
  
  const mx = player1[player1.length - 1][0];
  const my = player1[player1.length - 1][1];
  
  // Create sets excluding last move for player1
  const p1Set = createPosSet(player1.slice(0, -1));
  const p2Set = createPosSet(player2);

  // Check for immediate win (5 in a row)
  if (checkFiveFast(p1Set, mx, my)) return SCORES.WIN;

  // Check if blocking opponent's 4 in a row
  if (checkFiveFast(p2Set, mx, my)) return SCORES.BLOCK_FOUR;

  // Check for own 4 in a row
  const fourScore = checkFourFast(p1Set, p2Set, mx, my);
  if (fourScore > 0) return fourScore;

  // Check if blocking opponent's 3
  if (checkThreeFast(p2Set, p1Set, mx, my) > 0) return SCORES.BLOCK_THREE;

  // Check for own 3 in a row
  const threeScore = checkThreeFast(p1Set, p2Set, mx, my);
  if (threeScore > 0) return threeScore;

  // Check for 2 in a row
  if (checkTwoFast(p1Set, mx, my)) return SCORES.TWO;

  return SCORES.NONE;
}

// Legacy evaluate wrapper for backward compatibility
export function evaluate(player1, player2) {
  return evaluateFast(player1, player2);
}

function checkFiveFast(playerSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 0;
    for (let n = 1; n <= 4; n++) {
      if (hasPos(playerSet, mx + GRID_SIZE * n * dx, my + GRID_SIZE * n * dy)) count++;
      else break;
    }
    for (let n = 1; n <= 4; n++) {
      if (hasPos(playerSet, mx - GRID_SIZE * n * dx, my - GRID_SIZE * n * dy)) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

function checkFourFast(playerSet, opponentSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 0;
    let openEnds = 0;
    
    // Positive direction
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    // Negative direction
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    
    if (count >= 3) {
      return openEnds === 2 ? SCORES.FOUR_OPEN : (openEnds === 1 ? SCORES.FOUR_HALF : 0);
    }
  }
  return 0;
}

function checkThreeFast(playerSet, opponentSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 0;
    let openEnds = 0;
    
    for (let n = 1; n <= 3; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    for (let n = 1; n <= 3; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    
    if (count >= 2) {
      return openEnds === 2 ? SCORES.THREE_OPEN : (openEnds === 1 ? SCORES.THREE_HALF : 0);
    }
  }
  return 0;
}

function checkTwoFast(playerSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    if (hasPos(playerSet, mx + GRID_SIZE * dx, my + GRID_SIZE * dy) ||
        hasPos(playerSet, mx - GRID_SIZE * dx, my - GRID_SIZE * dy)) {
      return true;
    }
  }
  return false;
}

// Optimized checkWin using Set-based lookup
export function checkWin(player, x, y) {
  const playerSet = createPosSet(player);
  
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1; // Count the piece at (x, y)
    
    // Count in positive direction
    for (let n = 1; n <= 4; n++) {
      if (hasPos(playerSet, x + GRID_SIZE * n * dx, y + GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    // Count in negative direction
    for (let n = 1; n <= 4; n++) {
      if (hasPos(playerSet, x - GRID_SIZE * n * dx, y - GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    
    if (count >= 5) return true;
  }
  return false;
}

// Returns the winning line coordinates [[x1,y1], [x2,y2], ...] or null
export function getWinningLine(player, x, y) {
  const playerSet = createPosSet(player);
  
  for (const [dx, dy] of DIRECTIONS) {
    const line = [[x, y]];
    
    // Extend in positive direction
    for (let n = 1; n <= 4; n++) {
      const px = x + GRID_SIZE * n * dx;
      const py = y + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        line.push([px, py]);
      } else break;
    }
    // Extend in negative direction
    for (let n = 1; n <= 4; n++) {
      const px = x - GRID_SIZE * n * dx;
      const py = y - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        line.unshift([px, py]);
      } else break;
    }
    
    if (line.length >= 5) {
      return line.slice(0, 5); // Return first 5 in the line
    }
  }
  return null;
}

// Utility function to clear transposition table (call between games)
export function clearTranspositionTable() {
  transpositionTable.clear();
}
