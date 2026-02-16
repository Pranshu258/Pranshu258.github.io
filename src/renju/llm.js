// Azure OpenAI LLM integration for Renju
// Sends board state to an LLM and parses its move response

const GRID_SIZE = 40;
const COL_LABELS = 'ABCDEFGHIJKLMNO';

/**
 * Convert internal board coordinates to human-readable notation.
 * Internal: x = col * 40, y = row * 40  (0-560)
 * Human:    col A-O, row 1-15
 */
function toNotation(x, y) {
  const col = x / GRID_SIZE;
  const row = y / GRID_SIZE;
  return `${COL_LABELS[col]}${row + 1}`;
}

/**
 * Convert human-readable notation (e.g. "H8") to internal coordinates.
 * Returns [x, y] or null if invalid.
 */
function fromNotation(notation) {
  const match = notation.trim().match(/^([A-Oa-o])(\d{1,2})$/);
  if (!match) return null;

  const col = COL_LABELS.indexOf(match[1].toUpperCase());
  const row = parseInt(match[2], 10) - 1;

  if (col < 0 || col > 14 || row < 0 || row > 14) return null;
  return [col * GRID_SIZE, row * GRID_SIZE];
}

/**
 * Build a text representation of the board.
 *   - 'X' = Black stone
 *   - 'O' = White stone
 *   - '.' = empty
 */
function boardToText(blackMoves, whiteMoves) {
  const grid = Array.from({ length: 15 }, () => Array(15).fill('.'));

  for (const [x, y] of blackMoves) {
    grid[y / GRID_SIZE][x / GRID_SIZE] = 'X';
  }
  for (const [x, y] of whiteMoves) {
    grid[y / GRID_SIZE][x / GRID_SIZE] = 'O';
  }

  let text = '   ' + COL_LABELS.split('').join(' ') + '\n';
  for (let r = 0; r < 15; r++) {
    const rowLabel = String(r + 1).padStart(2, ' ');
    text += `${rowLabel} ${grid[r].join(' ')}\n`;
  }
  return text;
}

/**
 * Build a move-history string like: "1. H8 (Black)  2. I9 (White) …"
 */
function moveHistoryText(blackMoves, whiteMoves) {
  const moves = [];
  const maxLen = Math.max(blackMoves.length, whiteMoves.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < blackMoves.length) {
      moves.push(`${moves.length + 1}. ${toNotation(...blackMoves[i])} (Black)`);
    }
    if (i < whiteMoves.length) {
      moves.push(`${moves.length + 1}. ${toNotation(...whiteMoves[i])} (White)`);
    }
  }
  return moves.join('  ');
}

/**
 * Build the system + user prompt for the LLM.
 */
function buildPrompt(blackMoves, whiteMoves, llmColor) {
  const board = boardToText(blackMoves, whiteMoves);
  const history = moveHistoryText(blackMoves, whiteMoves);

  const yourStone = llmColor === 'black' ? 'X' : 'O';
  const opponentStone = llmColor === 'black' ? 'O' : 'X';

  const system = `You play Renju on a 15×15 board. Columns A-O, rows 1-15. You are ${yourStone} (${llmColor}). Reply with ONLY your move like H8. Nothing else.`;

  const user = `Board:
${board}
Moves so far: ${history || 'none'}

You are ${yourStone}. Opponent is ${opponentStone}.

Strategy priorities (in order):
1. If you can win (you have 4 in a row with an open end), play the winning move.
2. If opponent has 4 in a row or an open-ended 3, you MUST block it immediately or you lose.
3. Build toward 5 in a row while also blocking opponent threats.

Pick an empty intersection (marked .) for your move.

Your move (e.g. H8):`;

  return { system, user };
}

/**
 * Parse the LLM response text to extract a move coordinate.
 * Tries to find a valid notation like "H8" anywhere in the response.
 */
function parseLLMMove(responseText) {
  // Try exact match first
  const exact = fromNotation(responseText.trim());
  if (exact) return exact;

  // Search for a pattern like A1-O15 in the text
  const regex = /\b([A-Oa-o])(1[0-5]|[1-9])\b/g;
  let match;
  while ((match = regex.exec(responseText)) !== null) {
    const result = fromNotation(match[0]);
    if (result) return result;
  }

  return null;
}

/**
 * Query Azure OpenAI for a move.
 *
 * @param {Object} config - { endpoint, deploymentName, apiKey }
 * @param {Array} blackMoves  - [[x,y], ...]
 * @param {Array} whiteMoves  - [[x,y], ...]
 * @param {string} llmColor   - 'black' | 'white'
 * @param {Array} allMoves    - all occupied positions (for validation)
 * @param {number} maxRetries - retry count on invalid moves
 * @returns {Promise<{move: [number,number]|null, raw: string, error?: string}>}
 */
export async function getLLMMove(config, blackMoves, whiteMoves, llmColor, allMoves, maxRetries = 3) {
  const { endpoint, deploymentName, apiKey, apiVersion } = config;
  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion || '2024-02-01'}`;

  const { system, user } = buildPrompt(blackMoves, whiteMoves, llmColor);
  console.log(`[LLM] System prompt:\n${system}`);
  console.log(`[LLM] User prompt:\n${user}`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'developer', content: system },
            { role: 'user', content: user },
          ],
          max_completion_tokens: 2048,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Azure API error ${res.status}: ${errBody}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '';
      console.log(`[LLM] Turn response (attempt ${attempt + 1}):`, raw);
      console.log(`[LLM] Full API response:`, JSON.stringify(data, null, 2));
      const move = parseLLMMove(raw);

      if (!move) {
        console.warn(`[LLM] Attempt ${attempt + 1}: Could not parse move from "${raw}"`);
        continue;
      }

      // Validate the move is on an empty intersection
      const isOccupied = allMoves.some(([mx, my]) => mx === move[0] && my === move[1]);
      if (isOccupied) {
        console.warn(`[LLM] Attempt ${attempt + 1}: Move ${raw} is already occupied`);
        continue;
      }

      return { move, raw };
    } catch (err) {
      console.error(`[LLM] Attempt ${attempt + 1} error:`, err);
      if (attempt === maxRetries - 1) {
        return { move: null, raw: '', error: err.message };
      }
    }
  }

  return { move: null, raw: '', error: 'Failed to get a valid move after retries' };
}

export { toNotation, fromNotation, boardToText };
