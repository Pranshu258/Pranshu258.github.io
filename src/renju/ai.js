// AI Algorithm - Ported from algo.py
// Minimax with Alpha-Beta Pruning for Renju (Five in a Row)
// Optimized with Set-based lookups, transposition table, and consolidated patterns

const GRID_SIZE = 40;
const BOARD_MAX = 14 * GRID_SIZE; // 560 for 15x15 board
const MAX_CANDIDATE_MOVES = 10;

// Scores for evaluation (higher = better move)
const SCORES = {
  WIN: 100,              // 5 in a row - immediate win
  DOUBLE_FOUR: 90,       // Two open fours - guaranteed win
  FOUR_THREE: 85,        // Open four + open three - forces win
  DOUBLE_THREE: 80,      // Two open threes - creates unblockable threat
  BLOCK_FOUR: 75,        // Block opponent's 4 in a row
  FOUR_OPEN: 70,         // Own 4 with both ends open
  FOUR_HALF: 50,         // Own 4 with one end blocked
  BROKEN_FOUR: 45,       // XX_X or X_XX pattern
  BLOCK_THREE: 35,       // Block opponent's open 3
  THREE_OPEN: 30,        // Own 3 with both ends open
  THREE_HALF: 15,        // Own 3 with one end blocked
  JUMP_THREE: 12,        // X_XX_ pattern with gap
  TWO_OPEN: 5,           // Own 2 with both ends open
  TWO: 3,                // Own 2 in a row
  CENTER_BONUS: 2,       // Bonus for center positions
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

// Helper: Check if position is within valid board bounds
function isOnBoard(x, y) {
  return x >= 0 && x <= BOARD_MAX && y >= 0 && y <= BOARD_MAX;
}

// ============================================================
// RENJU FORBIDDEN MOVE DETECTION (for Black player only)
// ============================================================

/**
 * Check if a move would create an overline (6+ in a row)
 * This is forbidden for Black in Renju
 */
function wouldCreateOverline(playerSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1; // Count the move itself
    
    // Count in positive direction
    for (let n = 1; n <= 5; n++) {
      if (hasPos(playerSet, mx + GRID_SIZE * n * dx, my + GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    // Count in negative direction
    for (let n = 1; n <= 5; n++) {
      if (hasPos(playerSet, mx - GRID_SIZE * n * dx, my - GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    
    if (count > 5) return true;
  }
  return false;
}

/**
 * Count how many "open fours" a move creates
 * An open four is 4 in a row with at least one open end that can become 5
 */
function countFoursCreated(playerSet, opponentSet, mx, my) {
  let fourCount = 0;
  
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1; // Count the move itself
    let openEndPositive = false;
    let openEndNegative = false;
    
    // Count in positive direction
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        count++;
      } else {
        // Check if this end is open
        if (isOnBoard(px, py) && !hasPos(opponentSet, px, py)) {
          openEndPositive = true;
        }
        break;
      }
    }
    
    // Count in negative direction
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        count++;
      } else {
        // Check if this end is open
        if (isOnBoard(px, py) && !hasPos(opponentSet, px, py)) {
          openEndNegative = true;
        }
        break;
      }
    }
    
    // A four is created if we have exactly 4 in a row with potential to become 5
    if (count === 4 && (openEndPositive || openEndNegative)) {
      fourCount++;
    }
  }
  
  return fourCount;
}

/**
 * Count how many "open threes" a move creates
 * An open three is 3 in a row with BOTH ends open (can become an open four)
 */
function countOpenThreesCreated(playerSet, opponentSet, mx, my) {
  let threeCount = 0;
  
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1; // Count the move itself
    let openEndPositive = false;
    let openEndNegative = false;
    let spaceAfterPositive = false;
    let spaceAfterNegative = false;
    
    // Count in positive direction
    for (let n = 1; n <= 3; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        count++;
      } else {
        // Check if this end is open
        if (isOnBoard(px, py) && !hasPos(opponentSet, px, py)) {
          openEndPositive = true;
          // Check space after opening
          const nextPx = mx + GRID_SIZE * (n + 1) * dx;
          const nextPy = my + GRID_SIZE * (n + 1) * dy;
          if (isOnBoard(nextPx, nextPy) && !hasPos(opponentSet, nextPx, nextPy)) {
            spaceAfterPositive = true;
          }
        }
        break;
      }
    }
    
    // Count in negative direction
    for (let n = 1; n <= 3; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        count++;
      } else {
        // Check if this end is open
        if (isOnBoard(px, py) && !hasPos(opponentSet, px, py)) {
          openEndNegative = true;
          // Check space after opening
          const nextPx = mx - GRID_SIZE * (n + 1) * dx;
          const nextPy = my - GRID_SIZE * (n + 1) * dy;
          if (isOnBoard(nextPx, nextPy) && !hasPos(opponentSet, nextPx, nextPy)) {
            spaceAfterNegative = true;
          }
        }
        break;
      }
    }
    
    // An open three has exactly 3 stones with both ends open and room to grow
    if (count === 3 && openEndPositive && openEndNegative && 
        (spaceAfterPositive || spaceAfterNegative)) {
      threeCount++;
    }
  }
  
  return threeCount;
}

/**
 * Check if a move is forbidden for Black player in Renju
 * Forbidden moves: overline (6+), double-four (4-4), double-three (3-3)
 * Returns: { forbidden: boolean, reason: string }
 */
export function isForbiddenMove(playerMoves, opponentMoves, move, isBlack) {
  if (!isBlack) {
    return { forbidden: false, reason: null };
  }
  
  const [mx, my] = move;
  const playerSet = createPosSet(playerMoves);
  const opponentSet = createPosSet(opponentMoves);
  
  // Check for overline (6+ in a row)
  if (wouldCreateOverline(playerSet, mx, my)) {
    return { forbidden: true, reason: 'overline' };
  }
  
  // Check for double-four (two fours created)
  const fours = countFoursCreated(playerSet, opponentSet, mx, my);
  if (fours >= 2) {
    return { forbidden: true, reason: 'double-four' };
  }
  
  // Check for double-three (two open threes created)
  const openThrees = countOpenThreesCreated(playerSet, opponentSet, mx, my);
  if (openThrees >= 2) {
    return { forbidden: true, reason: 'double-three' };
  }
  
  return { forbidden: false, reason: null };
}

/**
 * Check win for Black considering the overline rule
 * Black must have EXACTLY 5 in a row, not more
 */
export function checkWinRenju(player, x, y, isBlack) {
  const playerSet = createPosSet(player);
  
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1; // Count the piece at (x, y)
    
    // Count in positive direction
    for (let n = 1; n <= 5; n++) {
      if (hasPos(playerSet, x + GRID_SIZE * n * dx, y + GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    // Count in negative direction
    for (let n = 1; n <= 5; n++) {
      if (hasPos(playerSet, x - GRID_SIZE * n * dx, y - GRID_SIZE * n * dy)) {
        count++;
      } else break;
    }
    
    // For Black: exactly 5 wins (overline doesn't count as win)
    // For White: 5 or more wins
    if (isBlack) {
      if (count === 5) return true;
    } else {
      if (count >= 5) return true;
    }
  }
  return false;
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
 * @param isBlack - whether the current player (at depth 0) is Black (for Renju rules)
 */
export function attack(player, otherPlayer, depth, maxDepth, alpha, beta, isBlack = false) {
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
  
  // At depth 0, filter forbidden moves if AI is Black
  const currentIsBlack = depth % 2 === 0 ? isBlack : !isBlack;
  const moves = getMovesOptimized(player, otherPlayer, currentIsBlack);

  for (const move of moves) {
    player.push(move); // Temporarily add move
    
    let score = attack(otherPlayer, player, depth + 1, maxDepth, -beta, -Math.max(alpha, bestScore), isBlack);
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
// Returns: { candidates, bestMove }
// isBlack: whether the AI (at depth 0) is playing Black (for Renju rules)
export async function attackWithVisualization(player, otherPlayer, maxDepth, onCandidateEvaluated, isBlack = false) {
  const candidates = [];
  let finalBestMove = null;
  
  async function search(playerArr, otherArr, depth, alpha, beta) {
    const playerSet = createPosSet(playerArr);
    
    if (isGameOverFast(playerSet, playerArr) || depth === maxDepth) {
      return evaluateFast(playerArr, otherArr);
    }

    let bestMove = null;
    let bestScore = -1000;
    // Apply Renju rules: at depth 0, AI is Black; at depth 1, opponent; alternates
    const currentIsBlack = depth % 2 === 0 ? isBlack : !isBlack;
    const moves = getMovesOptimized(playerArr, otherArr, currentIsBlack);

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

    if (depth === 0) {
      finalBestMove = bestMove;
    }

    return bestScore;
  }

  await search([...player], [...otherPlayer], 0, -1000, 1000);
  return { candidates, bestMove: finalBestMove };
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
// isBlack: if true, filter out forbidden moves for Black player (Renju rules)
function getMovesOptimized(player1, player2, isBlack = false) {
  const usedSet = createPosSet([...player1, ...player2]);
  const moveSet = new Set();
  let moves = [];

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

  // Filter out forbidden moves if playing as Black (Renju rules)
  if (isBlack) {
    const legalMoves = moves.filter(move => {
      const result = isForbiddenMove(player1, player2, move, true);
      return !result.forbidden;
    });
    // Fallback: if all moves are forbidden, use original moves to avoid getting stuck
    if (legalMoves.length > 0) {
      moves = legalMoves;
    }
    // If legalMoves is empty, keep original moves (AI must play something)
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
  
  // Track threat counts for combination detection
  let openThrees = 0;
  let openFours = 0;

  for (const [dx, dy] of DIRECTIONS) {
    let ownCount = 0;
    let oppCount = 0;
    let openEnds = 0;
    let gaps = 0;
    let gapPos = -1;

    // Count own pieces and check openness (positive direction)
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        ownCount++;
      } else if (!hasPos(opponentSet, px, py)) {
        if (gaps === 0 && n <= 3) {
          // Check for piece after gap (broken pattern)
          const nextPx = mx + GRID_SIZE * (n + 1) * dx;
          const nextPy = my + GRID_SIZE * (n + 1) * dy;
          if (hasPos(playerSet, nextPx, nextPy)) {
            gaps++;
            gapPos = n;
            continue;
          }
        }
        openEnds++;
        break;
      } else break;
    }
    // Negative direction
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) {
        ownCount++;
      } else if (!hasPos(opponentSet, px, py)) {
        if (gaps === 0 && n <= 3) {
          const nextPx = mx - GRID_SIZE * (n + 1) * dx;
          const nextPy = my - GRID_SIZE * (n + 1) * dy;
          if (hasPos(playerSet, nextPx, nextPy)) {
            gaps++;
            continue;
          }
        }
        openEnds++;
        break;
      } else break;
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
    if (ownCount >= 4) {
      score += SCORES.WIN;
      openFours++;
    } else if (ownCount === 3 && gaps === 1) {
      score += SCORES.BROKEN_FOUR; // XX_X pattern
    } else if (ownCount === 3 && openEnds === 2) {
      score += SCORES.FOUR_OPEN;
      openFours++;
    } else if (ownCount === 3) {
      score += SCORES.FOUR_HALF;
    } else if (ownCount === 2 && gaps === 1 && openEnds >= 1) {
      score += SCORES.JUMP_THREE; // X_XX pattern
    } else if (ownCount === 2 && openEnds === 2) {
      score += SCORES.THREE_OPEN;
      openThrees++;
    } else if (ownCount === 2) {
      score += SCORES.THREE_HALF;
    } else if (ownCount === 1 && openEnds === 2) {
      score += SCORES.TWO_OPEN;
    } else if (ownCount === 1) {
      score += SCORES.TWO;
    }

    // Blocking bonus
    if (oppCount >= 4) score += SCORES.BLOCK_FOUR;
    else if (oppCount === 3) score += SCORES.BLOCK_THREE;
  }

  // Combination bonuses (very powerful)
  if (openFours >= 2) score += SCORES.DOUBLE_FOUR;
  if (openFours >= 1 && openThrees >= 1) score += SCORES.FOUR_THREE;
  if (openThrees >= 2) score += SCORES.DOUBLE_THREE;

  // Center position bonus (prefer moves near center)
  const centerX = BOARD_MAX / 2;
  const centerY = BOARD_MAX / 2;
  const distFromCenter = Math.abs(mx - centerX) + Math.abs(my - centerY);
  if (distFromCenter < GRID_SIZE * 3) {
    score += SCORES.CENTER_BONUS;
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

  // Check for combination threats
  const threatInfo = countThreats(p1Set, p2Set, mx, my);
  
  // Double four or four-three is nearly winning
  if (threatInfo.openFours >= 2) return SCORES.DOUBLE_FOUR;
  if (threatInfo.openFours >= 1 && threatInfo.openThrees >= 1) return SCORES.FOUR_THREE;
  if (threatInfo.openThrees >= 2) return SCORES.DOUBLE_THREE;

  // Check for own 4 in a row
  const fourScore = checkFourFast(p1Set, p2Set, mx, my);
  if (fourScore > 0) return fourScore;
  
  // Check for broken four (XX_X pattern)
  if (checkBrokenFour(p1Set, mx, my)) return SCORES.BROKEN_FOUR;

  // Check if blocking opponent's 3
  if (checkThreeFast(p2Set, p1Set, mx, my) > 0) return SCORES.BLOCK_THREE;

  // Check for own 3 in a row
  const threeScore = checkThreeFast(p1Set, p2Set, mx, my);
  if (threeScore > 0) return threeScore;
  
  // Check for jump three (X_XX pattern)
  if (checkJumpThree(p1Set, p2Set, mx, my)) return SCORES.JUMP_THREE;

  // Check for 2 in a row (open vs closed)
  if (checkTwoOpen(p1Set, p2Set, mx, my)) return SCORES.TWO_OPEN;
  if (checkTwoFast(p1Set, mx, my)) return SCORES.TWO;
  
  // Center position bonus
  const centerX = BOARD_MAX / 2;
  const centerY = BOARD_MAX / 2;
  const distFromCenter = Math.abs(mx - centerX) + Math.abs(my - centerY);
  if (distFromCenter < GRID_SIZE * 3) {
    return SCORES.CENTER_BONUS;
  }

  return SCORES.NONE;
}

// Count open threes and fours for combination detection
function countThreats(playerSet, opponentSet, mx, my) {
  let openThrees = 0;
  let openFours = 0;
  
  for (const [dx, dy] of DIRECTIONS) {
    let count = 0;
    let openEnds = 0;
    
    for (let n = 1; n <= 4; n++) {
      const px = mx + GRID_SIZE * n * dx;
      const py = my + GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    for (let n = 1; n <= 4; n++) {
      const px = mx - GRID_SIZE * n * dx;
      const py = my - GRID_SIZE * n * dy;
      if (hasPos(playerSet, px, py)) count++;
      else {
        if (!hasPos(opponentSet, px, py)) openEnds++;
        break;
      }
    }
    
    if (count >= 3 && openEnds >= 1) openFours++;
    else if (count === 2 && openEnds === 2) openThrees++;
  }
  
  return { openThrees, openFours };
}

// Check for broken four pattern (XX_X or X_XX)
function checkBrokenFour(playerSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    // Pattern: [mx,my] X _ X X or X X _ X [mx,my] etc.
    // Check if placing here completes a broken four
    for (let offset = -3; offset <= 0; offset++) {
      let count = 0;
      let gapCount = 0;
      let gapFillsWithMove = false;
      
      for (let i = 0; i < 5; i++) {
        const pos = offset + i;
        const px = mx + GRID_SIZE * pos * dx;
        const py = my + GRID_SIZE * pos * dy;
        
        if (pos === 0) {
          // This is where the move would be placed
          gapFillsWithMove = true;
          count++;
        } else if (hasPos(playerSet, px, py)) {
          count++;
        } else {
          gapCount++;
        }
      }
      
      // Broken four: 4 pieces with 1 gap that this move fills
      if (count === 4 && gapCount === 1 && gapFillsWithMove) {
        return true;
      }
    }
  }
  return false;
}

// Check for jump three pattern (X_XX with gap)
function checkJumpThree(playerSet, opponentSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    // Check pattern like: [move] _ X X or X X _ [move]
    for (const dir of [1, -1]) {
      // Gap at position 1, pieces at 2 and 3
      const gapX = mx + GRID_SIZE * 1 * dir * dx;
      const gapY = my + GRID_SIZE * 1 * dir * dy;
      const p1x = mx + GRID_SIZE * 2 * dir * dx;
      const p1y = my + GRID_SIZE * 2 * dir * dy;
      const p2x = mx + GRID_SIZE * 3 * dir * dx;
      const p2y = my + GRID_SIZE * 3 * dir * dy;
      
      if (!hasPos(playerSet, gapX, gapY) && !hasPos(opponentSet, gapX, gapY) &&
          hasPos(playerSet, p1x, p1y) && hasPos(playerSet, p2x, p2y)) {
        return true;
      }
    }
  }
  return false;
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

// Check for open two (two in a row with both ends open)
function checkTwoOpen(playerSet, opponentSet, mx, my) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 0;
    let openEnds = 0;
    
    // Check positive direction
    const p1x = mx + GRID_SIZE * dx;
    const p1y = my + GRID_SIZE * dy;
    if (hasPos(playerSet, p1x, p1y)) {
      count++;
      const endX = mx + GRID_SIZE * 2 * dx;
      const endY = my + GRID_SIZE * 2 * dy;
      if (!hasPos(playerSet, endX, endY) && !hasPos(opponentSet, endX, endY)) {
        openEnds++;
      }
    }
    
    // Check negative direction
    const n1x = mx - GRID_SIZE * dx;
    const n1y = my - GRID_SIZE * dy;
    if (hasPos(playerSet, n1x, n1y)) {
      count++;
      const endX = mx - GRID_SIZE * 2 * dx;
      const endY = my - GRID_SIZE * 2 * dy;
      if (!hasPos(playerSet, endX, endY) && !hasPos(opponentSet, endX, endY)) {
        openEnds++;
      }
    }
    
    if (count >= 1 && openEnds === 2) return true;
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
