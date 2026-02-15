// Game logic utilities

export const GRID_SIZE = 40;
export const BOARD_SIZE = 600;  // 15 lines + padding: 20 + 14*40 + 20 = 600
export const BOARD_OFFSET = 20;

export function snapToGrid(pos) {
  // Snap to nearest grid intersection
  // Grid intersections are at BOARD_OFFSET + n * GRID_SIZE for n = 0, 1, 2, ... 14
  const adjusted = pos - BOARD_OFFSET;
  const gridIndex = Math.round(adjusted / GRID_SIZE);
  // Clamp to valid range 0-14
  const clampedIndex = Math.max(0, Math.min(14, gridIndex));
  const snapped = BOARD_OFFSET + clampedIndex * GRID_SIZE;
  // Return the position adjusted for how stones are drawn (with GRID_SIZE/2 offset)
  return snapped - GRID_SIZE / 2;
}

export function isValidMove(x, y, humanMoves, computerMoves) {
  // Valid stored coordinates range from 0 to 560 (14 * 40)
  // which corresponds to grid indices 0 to 14
  const minPos = 0;
  const maxPos = 14 * GRID_SIZE; // 560
  
  if (x < minPos || x > maxPos || y < minPos || y > maxPos) {
    return false;
  }

  const allMoves = [...humanMoves, ...computerMoves];
  return !allMoves.some(([mx, my]) => mx === x && my === y);
}

export function saveGame(gameState) {
  try {
    localStorage.setItem('renju_saved_game', JSON.stringify(gameState));
    return true;
  } catch (e) {
    console.error('Failed to save game:', e);
    return false;
  }
}

export function loadGame() {
  try {
    const saved = localStorage.getItem('renju_saved_game');
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Failed to load game:', e);
    return null;
  }
}

export function clearSavedGame() {
  localStorage.removeItem('renju_saved_game');
}
