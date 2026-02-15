// AI Algorithm - Ported from algo.py
// Minimax with Alpha-Beta Pruning for Renju (Five in a Row)

const GRID_SIZE = 40;

export function attack(player, otherPlayer, depth, maxDepth, alpha, beta) {
  if (isGameOver(player) || depth === maxDepth) {
    return evaluate(player, otherPlayer);
  }

  let bestMove = null;
  let bestScore = -1000;
  const moves = getMoves(player, otherPlayer);

  for (const move of moves) {
    const newPlayer = [...player, move];
    const newOther = [...otherPlayer];
    
    let score = attack(newOther, newPlayer, depth + 1, maxDepth, -beta, -Math.max(alpha, bestScore));
    score = -score;

    // Tie-breaking: randomly choose between equally-scored moves for variety
    if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
      bestScore = score;
      bestMove = move;
      if (bestScore >= beta) {
        return bestScore;
      }
    }
  }

  if (depth === 0 && bestMove) {
    player.push(bestMove);
  }

  return bestScore;
}

// Async version that reports candidates being considered
export async function attackWithVisualization(player, otherPlayer, maxDepth, onCandidateEvaluated) {
  const candidates = [];
  
  async function search(player, otherPlayer, depth, alpha, beta) {
    if (isGameOver(player) || depth === maxDepth) {
      return evaluate(player, otherPlayer);
    }

    let bestMove = null;
    let bestScore = -1000;
    const moves = getMoves(player, otherPlayer);

    for (const move of moves) {
      const newPlayer = [...player, move];
      const newOther = [...otherPlayer];
      
      // At depth 0, report the candidate being evaluated
      if (depth === 0) {
        onCandidateEvaluated(move, 'evaluating');
        // Small delay to visualize
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      let score = await search(newOther, newPlayer, depth + 1, -beta, -Math.max(alpha, bestScore));
      score = -score;

      if (depth === 0) {
        candidates.push({ move, score });
        onCandidateEvaluated(move, 'evaluated', score);
      }

      // Tie-breaking: randomly choose between equally-scored moves for variety
      if (score > bestScore || (score === bestScore && Math.random() > 0.5)) {
        bestScore = score;
        bestMove = move;
        if (bestScore >= beta) {
          return bestScore;
        }
      }
    }

    if (depth === 0 && bestMove) {
      player.push(bestMove);
    }

    return bestScore;
  }

  await search(player, otherPlayer, 0, -1000, 1000);
  return candidates;
}

function isGameOver(player) {
  for (let i = 0; i < player.length; i++) {
    const [x, y] = player[i];
    
    // Check horizontal
    let count = 1;
    for (let n = 1; n <= 4; n++) {
      if (player.some(([px, py]) => px === x + GRID_SIZE * n && py === y)) {
        count++;
      } else {
        break;
      }
    }
    if (count === 5) return true;

    // Check vertical
    count = 1;
    for (let n = 1; n <= 4; n++) {
      if (player.some(([px, py]) => px === x && py === y + GRID_SIZE * n)) {
        count++;
      } else {
        break;
      }
    }
    if (count === 5) return true;

    // Check diagonal (SE)
    count = 1;
    for (let n = 1; n <= 4; n++) {
      if (player.some(([px, py]) => px === x + GRID_SIZE * n && py === y + GRID_SIZE * n)) {
        count++;
      } else {
        break;
      }
    }
    if (count === 5) return true;

    // Check diagonal (SW)
    count = 1;
    for (let n = 1; n <= 4; n++) {
      if (player.some(([px, py]) => px === x + GRID_SIZE * n && py === y - GRID_SIZE * n)) {
        count++;
      } else {
        break;
      }
    }
    if (count === 5) return true;
  }
  return false;
}

function getMoves(player1, player2) {
  const moves = [];
  const used = [...player1, ...player2];
  const moveSet = new Set();

  for (const [x, y] of used) {
    const neighbors = [
      [x, y - GRID_SIZE],
      [x + GRID_SIZE, y - GRID_SIZE],
      [x + GRID_SIZE, y],
      [x + GRID_SIZE, y + GRID_SIZE],
      [x, y + GRID_SIZE],
      [x - GRID_SIZE, y + GRID_SIZE],
      [x - GRID_SIZE, y],
      [x - GRID_SIZE, y - GRID_SIZE]
    ];

    for (const [nx, ny] of neighbors) {
      const key = `${nx},${ny}`;
      if (!used.some(([ux, uy]) => ux === nx && uy === ny) && !moveSet.has(key)) {
        moveSet.add(key);
        // Valid range: 0 to 560 (14 * 40) for 15x15 board
        if (nx >= 0 && nx <= 560 && ny >= 0 && ny <= 560) {
          moves.push([nx, ny]);
        }
      }
    }
  }

  // Score and sort moves
  const scoredMoves = moves.map(move => ({
    move,
    score: evaluate([...player1, move], player2)
  }));

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves.slice(0, 10).map(sm => sm.move); // Return top 10 moves
}

export function evaluate(player1, player2) {
  if (player1.length === 0) return 0;
  
  const p = [...player1];
  const m = p[p.length - 1];
  const [mx, my] = m;
  p.pop(); // Remove last move for checking

  // Check for immediate win (5 in a row) - highest priority
  if (checkFive(p, mx, my)) return 10;

  // Check if blocking opponent's 4 in a row
  if (checkOpponentFour(player2, mx, my)) return 9;

  // Check for own 4 in a row (both sides unblocked)
  const fourScore = checkFour(p, player2, mx, my);
  if (fourScore > 0) return fourScore;

  // Check if blocking opponent's 3 in a row
  if (checkOpponentThree(player2, mx, my)) return 6;

  // Check for own 3 in a row
  const threeScore = checkThree(p, player2, mx, my);
  if (threeScore > 0) return threeScore;

  // Check for 2 in a row
  if (checkTwo(p, player2, mx, my)) return 2;

  return 0;
}

function checkFive(player, mx, my) {
  const directions = [
    [[40, 0], [80, 0], [120, 0], [160, 0]], // Right
    [[-40, 0], [-80, 0], [-120, 0], [-160, 0]], // Left
    [[0, 40], [0, 80], [0, 120], [0, 160]], // Down
    [[0, -40], [0, -80], [0, -120], [0, -160]], // Up
    [[40, 40], [80, 80], [120, 120], [160, 160]], // SE
    [[-40, -40], [-80, -80], [-120, -120], [-160, -160]], // NW
    [[-40, 40], [-80, 80], [-120, 120], [-160, 160]], // SW
    [[40, -40], [80, -80], [120, -120], [160, -160]], // NE
    // Middle positions
    [[-40, 0], [40, 0], [80, 0], [120, 0]],
    [[-80, 0], [-40, 0], [40, 0], [80, 0]],
    [[-120, 0], [-80, 0], [-40, 0], [40, 0]],
    [[0, -40], [0, 40], [0, 80], [0, 120]],
    [[0, -80], [0, -40], [0, 40], [0, 80]],
    [[0, -120], [0, -80], [0, -40], [0, 40]],
    [[-40, -40], [40, 40], [80, 80], [120, 120]],
    [[-80, -80], [-40, -40], [40, 40], [80, 80]],
    [[-120, -120], [-80, -80], [-40, -40], [40, 40]],
    [[-40, 40], [40, -40], [80, -80], [120, -120]],
    [[-80, 80], [-40, 40], [40, -40], [80, -80]],
    [[-120, 120], [-80, 80], [-40, 40], [40, -40]]
  ];

  for (const dir of directions) {
    if (dir.every(([dx, dy]) => player.some(([px, py]) => px === mx + dx && py === my + dy))) {
      return true;
    }
  }
  return false;
}

function checkOpponentFour(opponent, mx, my) {
  return checkFive(opponent.filter(([x, y]) => !(x === mx && y === my)), mx, my);
}

function checkFour(player, opponent, mx, my) {
  const fourPatterns = [
    { pattern: [[40, 0], [80, 0], [120, 0]], ends: [[-40, 0], [160, 0]] },
    { pattern: [[-40, 0], [40, 0], [80, 0]], ends: [[-80, 0], [120, 0]] },
    { pattern: [[-80, 0], [-40, 0], [40, 0]], ends: [[-120, 0], [80, 0]] },
    { pattern: [[-120, 0], [-80, 0], [-40, 0]], ends: [[-160, 0], [40, 0]] },
    { pattern: [[0, 40], [0, 80], [0, 120]], ends: [[0, -40], [0, 160]] },
    { pattern: [[0, -40], [0, 40], [0, 80]], ends: [[0, -80], [0, 120]] },
    { pattern: [[0, -80], [0, -40], [0, 40]], ends: [[0, -120], [0, 80]] },
    { pattern: [[0, -120], [0, -80], [0, -40]], ends: [[0, -160], [0, 40]] },
    { pattern: [[40, 40], [80, 80], [120, 120]], ends: [[-40, -40], [160, 160]] },
    { pattern: [[-40, -40], [40, 40], [80, 80]], ends: [[-80, -80], [120, 120]] },
    { pattern: [[40, -40], [80, -80], [120, -120]], ends: [[-40, 40], [160, -160]] },
    { pattern: [[-40, 40], [40, -40], [80, -80]], ends: [[-80, 80], [120, -120]] }
  ];

  for (const { pattern, ends } of fourPatterns) {
    const hasPattern = pattern.every(([dx, dy]) => 
      player.some(([px, py]) => px === mx + dx && py === my + dy)
    );
    
    if (hasPattern) {
      const bothEndsOpen = ends.every(([dx, dy]) => 
        !opponent.some(([px, py]) => px === mx + dx && py === my + dy)
      );
      
      if (bothEndsOpen) return 8;
      
      const oneEndOpen = ends.some(([dx, dy]) => 
        !opponent.some(([px, py]) => px === mx + dx && py === my + dy)
      );
      
      if (oneEndOpen) return 7;
    }
  }
  return 0;
}

function checkOpponentThree(opponent, mx, my) {
  // Simplified check for blocking opponent's three
  const threePatterns = [
    [[40, 0], [80, 0], [120, 0]],
    [[-40, 0], [-80, 0], [-120, 0]],
    [[0, 40], [0, 80], [0, 120]],
    [[0, -40], [0, -80], [0, -120]],
    [[40, 40], [80, 80], [120, 120]],
    [[-40, -40], [-80, -80], [-120, -120]]
  ];

  for (const pattern of threePatterns) {
    if (pattern.every(([dx, dy]) => 
      opponent.some(([px, py]) => px === mx + dx && py === my + dy)
    )) {
      return true;
    }
  }
  return false;
}

function checkThree(player, opponent, mx, my) {
  const threePatterns = [
    { pattern: [[40, 0], [80, 0]], space: [[-40, 0], [120, 0]], outer: [[-80, 0], [160, 0]] },
    { pattern: [[0, 40], [0, 80]], space: [[0, -40], [0, 120]], outer: [[0, -80], [0, 160]] },
    { pattern: [[40, 40], [80, 80]], space: [[-40, -40], [120, 120]], outer: [[-80, -80], [160, 160]] },
    { pattern: [[40, -40], [80, -80]], space: [[-40, 40], [120, -120]], outer: [[-80, 80], [160, -160]] }
  ];

  for (const { pattern, space, outer } of threePatterns) {
    const hasPattern = pattern.every(([dx, dy]) => 
      player.some(([px, py]) => px === mx + dx && py === my + dy)
    );
    
    if (hasPattern) {
      const spacesClear = space.every(([dx, dy]) => 
        !opponent.some(([px, py]) => px === mx + dx && py === my + dy)
      );
      
      if (spacesClear) {
        const outerClear = outer.every(([dx, dy]) => 
          !opponent.some(([px, py]) => px === mx + dx && py === my + dy)
        );
        return outerClear ? 5 : 4;
      }
    }
  }
  return 0;
}

function checkTwo(player, opponent, mx, my) {
  const twoPatterns = [
    [[40, 0]], [[-40, 0]], [[0, 40]], [[0, -40]],
    [[40, 40]], [[-40, -40]], [[40, -40]], [[-40, 40]]
  ];

  for (const pattern of twoPatterns) {
    if (pattern.every(([dx, dy]) => 
      player.some(([px, py]) => px === mx + dx && py === my + dy)
    )) {
      return true;
    }
  }
  return false;
}

export function checkWin(player, x, y) {
  const patterns = [
    [[40, 0], [80, 0], [120, 0], [160, 0]],
    [[-40, 0], [-80, 0], [-120, 0], [-160, 0]],
    [[0, 40], [0, 80], [0, 120], [0, 160]],
    [[0, -40], [0, -80], [0, -120], [0, -160]],
    [[40, 40], [80, 80], [120, 120], [160, 160]],
    [[-40, -40], [-80, -80], [-120, -120], [-160, -160]],
    [[-40, 40], [-80, 80], [-120, 120], [-160, 160]],
    [[40, -40], [80, -80], [120, -120], [160, -160]],
    [[-40, 0], [40, 0], [80, 0], [120, 0]],
    [[-80, 0], [-40, 0], [40, 0], [80, 0]],
    [[-120, 0], [-80, 0], [-40, 0], [40, 0]],
    [[0, -40], [0, 40], [0, 80], [0, 120]],
    [[0, -80], [0, -40], [0, 40], [0, 80]],
    [[0, -120], [0, -80], [0, -40], [0, 40]],
    [[-40, -40], [40, 40], [80, 80], [120, 120]],
    [[-80, -80], [-40, -40], [40, 40], [80, 80]],
    [[-120, -120], [-80, -80], [-40, -40], [40, 40]],
    [[-40, 40], [40, -40], [80, -80], [120, -120]],
    [[-80, 80], [-40, 40], [40, -40], [80, -80]],
    [[-120, 120], [-80, 80], [-40, 40], [40, -40]]
  ];

  for (const pattern of patterns) {
    if (pattern.every(([dx, dy]) => player.some(([px, py]) => px === x + dx && py === y + dy))) {
      return true;
    }
  }
  return false;
}

// Returns the winning line coordinates [[x1,y1], [x2,y2], ...] or null
export function getWinningLine(player, x, y) {
  const patterns = [
    [[0, 0], [40, 0], [80, 0], [120, 0], [160, 0]],
    [[0, 0], [-40, 0], [-80, 0], [-120, 0], [-160, 0]],
    [[0, 0], [0, 40], [0, 80], [0, 120], [0, 160]],
    [[0, 0], [0, -40], [0, -80], [0, -120], [0, -160]],
    [[0, 0], [40, 40], [80, 80], [120, 120], [160, 160]],
    [[0, 0], [-40, -40], [-80, -80], [-120, -120], [-160, -160]],
    [[0, 0], [-40, 40], [-80, 80], [-120, 120], [-160, 160]],
    [[0, 0], [40, -40], [80, -80], [120, -120], [160, -160]],
    [[-40, 0], [0, 0], [40, 0], [80, 0], [120, 0]],
    [[-80, 0], [-40, 0], [0, 0], [40, 0], [80, 0]],
    [[-120, 0], [-80, 0], [-40, 0], [0, 0], [40, 0]],
    [[0, -40], [0, 0], [0, 40], [0, 80], [0, 120]],
    [[0, -80], [0, -40], [0, 0], [0, 40], [0, 80]],
    [[0, -120], [0, -80], [0, -40], [0, 0], [0, 40]],
    [[-40, -40], [0, 0], [40, 40], [80, 80], [120, 120]],
    [[-80, -80], [-40, -40], [0, 0], [40, 40], [80, 80]],
    [[-120, -120], [-80, -80], [-40, -40], [0, 0], [40, 40]],
    [[-40, 40], [0, 0], [40, -40], [80, -80], [120, -120]],
    [[-80, 80], [-40, 40], [0, 0], [40, -40], [80, -80]],
    [[-120, 120], [-80, 80], [-40, 40], [0, 0], [40, -40]]
  ];

  for (const pattern of patterns) {
    const line = pattern.map(([dx, dy]) => [x + dx, y + dy]);
    if (line.every(([px, py]) => player.some(([mx, my]) => mx === px && my === py))) {
      return line;
    }
  }
  return null;
}
