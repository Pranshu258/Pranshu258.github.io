// LLM integration for Renju (Azure OpenAI + WebLLM on-device)
// Sends board state to an LLM and parses its move response

// WebLLM is lazily imported to avoid bundling ~6MB upfront
let webllmModule = null;
async function getWebLLMLib() {
  if (!webllmModule) {
    webllmModule = await import('@mlc-ai/web-llm');
  }
  return webllmModule;
}

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
 * Analyze board for threats: lines of N stones with open ends.
 * Returns array of { count, openEnds, blockingMoves: [notation], stones: [notation] }
 */
function findThreats(attackerMoves, defenderMoves, allOccupied) {
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const grid = Array.from({ length: 15 }, () => Array(15).fill('.'));
  const attackerSet = new Set();
  const occupiedSet = new Set();

  for (const [x, y] of attackerMoves) {
    const c = x / GRID_SIZE, r = y / GRID_SIZE;
    grid[r][c] = 'A';
    attackerSet.add(`${c},${r}`);
  }
  for (const [x, y] of defenderMoves) {
    const c = x / GRID_SIZE, r = y / GRID_SIZE;
    grid[r][c] = 'D';
  }
  for (const [x, y] of allOccupied) {
    occupiedSet.add(`${x / GRID_SIZE},${y / GRID_SIZE}`);
  }

  const threats = [];
  const seen = new Set();

  for (const [x, y] of attackerMoves) {
    const col = x / GRID_SIZE, row = y / GRID_SIZE;
    for (const [dc, dr] of DIRS) {
      // Only scan in positive direction to avoid duplicates
      const stones = [];
      const blockingMoves = [];

      // Walk backward to find the start of this line
      let sc = col, sr = row;
      while (sc - dc >= 0 && sc - dc <= 14 && sr - dr >= 0 && sr - dr <= 14 && attackerSet.has(`${sc - dc},${sr - dr}`)) {
        sc -= dc; sr -= dr;
      }

      // Now walk forward collecting stones and gaps
      let c = sc, r = sr;
      while (c >= 0 && c <= 14 && r >= 0 && r <= 14 && (attackerSet.has(`${c},${r}`) || (!occupiedSet.has(`${c},${r}`) && stones.length > 0))) {
        if (attackerSet.has(`${c},${r}`)) {
          stones.push([c, r]);
        } else if (!occupiedSet.has(`${c},${r}`)) {
          // Gap in the line — only allow one gap
          break;
        } else {
          break; // defender stone blocks
        }
        c += dc; r += dr;
      }

      if (stones.length < 3) continue;

      const key = stones.map(([a, b]) => `${a},${b}`).sort().join('|') + `|${dc},${dr}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // Find open ends (empty squares at both ends of the line)
      let openEnds = 0;
      // Check before start
      const bc = sc - dc, br = sr - dr;
      if (bc >= 0 && bc <= 14 && br >= 0 && br <= 14 && !occupiedSet.has(`${bc},${br}`)) {
        openEnds++;
        blockingMoves.push(toNotation(bc * GRID_SIZE, br * GRID_SIZE));
      }
      // Check after end
      if (c >= 0 && c <= 14 && r >= 0 && r <= 14 && !occupiedSet.has(`${c},${r}`)) {
        openEnds++;
        blockingMoves.push(toNotation(c * GRID_SIZE, r * GRID_SIZE));
      }

      if (openEnds > 0) {
        threats.push({
          count: stones.length,
          openEnds,
          blockingMoves,
          stones: stones.map(([a, b]) => toNotation(a * GRID_SIZE, b * GRID_SIZE))
        });
      }
    }
  }

  // Sort by severity: longer lines first, then more open ends
  threats.sort((a, b) => b.count - a.count || b.openEnds - a.openEnds);
  return threats;
}

/**
 * Build the system + user prompt for the LLM.
 */
function buildPrompt(blackMoves, whiteMoves, llmColor, threatHints = true) {
  const board = boardToText(blackMoves, whiteMoves);
  const history = moveHistoryText(blackMoves, whiteMoves);

  const yourStone = llmColor === 'black' ? 'X' : 'O';
  const opponentStone = llmColor === 'black' ? 'O' : 'X';

  let threatWarning = '';

  if (threatHints) {
    const yourMoves = llmColor === 'black' ? blackMoves : whiteMoves;
    const oppMoves = llmColor === 'black' ? whiteMoves : blackMoves;
    const allOccupied = [...blackMoves, ...whiteMoves];

    // Pre-compute threats
    const oppThreats = findThreats(oppMoves, yourMoves, allOccupied);
    const yourThreats = findThreats(yourMoves, oppMoves, allOccupied);

    // Your winning opportunities
    const yourWins = yourThreats.filter(t => t.count >= 4);
    if (yourWins.length > 0) {
      threatWarning += '\n*** YOU CAN WIN! You have 4+ in a row. Play: ' + yourWins[0].blockingMoves.join(' or ') + ' ***\n';
    }

    // Opponent critical threats (must block)
    const criticalThreats = oppThreats.filter(t => t.count >= 4);
    const seriousThreats = oppThreats.filter(t => t.count === 3 && t.openEnds === 2);

    if (criticalThreats.length > 0) {
      for (const t of criticalThreats) {
        threatWarning += `\n!!! CRITICAL: Opponent has ${t.count} in a row at ${t.stones.join(',')}. BLOCK NOW at: ${t.blockingMoves.join(' or ')} !!!\n`;
      }
    }
    if (seriousThreats.length > 0) {
      for (const t of seriousThreats) {
        threatWarning += `\n!! WARNING: Opponent has open 3 at ${t.stones.join(',')}. Block at: ${t.blockingMoves.join(' or ')} !!\n`;
      }
    }
  }

  const colorRules = llmColor === 'black'
    ? `You are X (Black). Black has restrictions: no double-three (3-3), no double-four (4-4), no overline (6+). A forbidden move loses immediately.`
    : `You are O (White). White has NO restrictions — you may freely create double-threes, double-fours, and overlines. Exploit Black's restrictions by forcing positions where Black's responses are forbidden.`;

  const system = `You are an expert Renju player on a 15×15 board. Columns A-O, rows 1-15. X=Black, O=White. ${colorRules} Respond with ONLY your move coordinate like H8. Nothing else.`;

  const strategySection = threatWarning
    ? `${threatWarning}
Tactical priorities:
1. Play any winning move shown above immediately.
2. Block any CRITICAL/WARNING threat above — failure to block loses.
3. Create forks (multiple simultaneous threats the opponent cannot all block).
4. Build open threes that can become open fours.
5. Control center and adjacent intersections.`
    : `Tactical priorities:
1. Check for an immediate winning move (you have 4 in a line with an open end).
2. Block opponent's fours (straight or broken) — they win next turn if unblocked.
3. Block opponent's open threes — they become unstoppable fours if unblocked.
4. Create forks: multiple simultaneous threats (e.g. open-three + four) the opponent cannot all block.
5. Build open threes near your existing stones to set up forcing sequences.
6. Control center and key intersections.${llmColor === 'black' ? '\n7. Before playing, verify your move does not create a forbidden double-three, double-four, or overline.' : ''}`;

  const user = `Board:
${board}
Move history: ${history || 'none'}

${strategySection}

Pick an empty intersection (.) for your move.

Your move:`;

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
export async function getLLMMove(config, blackMoves, whiteMoves, llmColor, allMoves, maxRetries = 3, threatHints = true) {
  const { endpoint, deploymentName, apiKey, apiVersion } = config;
  const url = `${endpoint.replace(/\/+$/, '')}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion || '2024-02-01'}`;

  const { system, user } = buildPrompt(blackMoves, whiteMoves, llmColor, threatHints);
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
        console.error(`[LLM] Azure API error ${res.status}:`, errBody);
        throw new Error(`LLM call failed (${res.status})`);
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

// ============================================================
// WebLLM (on-device) support
// ============================================================

const WEBLLM_MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B (fast)', size: '~1 GB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B', size: '~2 GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 Mini 3.8B', size: '~2.5 GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', label: 'SmolLM2 1.7B (tiny)', size: '~1 GB' },
];

let webllmEngine = null;
let webllmLoadedModel = null;

/**
 * Load a WebLLM model. Calls onProgress with { text, progress } during download/init.
 * Returns true on success.
 */
async function loadWebLLMModel(modelId, onProgress) {
  if (webllmEngine && webllmLoadedModel === modelId) {
    return true; // Already loaded
  }

  // Unload previous engine if different model
  if (webllmEngine) {
    webllmEngine = null;
    webllmLoadedModel = null;
  }

  try {
    const webllm = await getWebLLMLib();
    webllmEngine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        if (onProgress) {
          onProgress({ text: report.text, progress: report.progress });
        }
      },
    });
    webllmLoadedModel = modelId;
    return true;
  } catch (err) {
    console.error('[WebLLM] Failed to load model:', err);
    webllmEngine = null;
    webllmLoadedModel = null;
    throw err;
  }
}

/**
 * Query the on-device WebLLM model for a move.
 * Same interface as getLLMMove.
 */
async function getWebLLMMove(blackMoves, whiteMoves, llmColor, allMoves, maxRetries = 3, threatHints = true) {
  if (!webllmEngine) {
    return { move: null, raw: '', error: 'WebLLM model not loaded' };
  }

  const { system, user } = buildPrompt(blackMoves, whiteMoves, llmColor, threatHints);
  console.log(`[WebLLM] System prompt:\n${system}`);
  console.log(`[WebLLM] User prompt:\n${user}`);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const reply = await webllmEngine.chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 32,
        temperature: 0.3,
      });

      const raw = reply.choices?.[0]?.message?.content ?? '';
      console.log(`[WebLLM] Response (attempt ${attempt + 1}):`, raw);

      const move = parseLLMMove(raw);
      if (!move) {
        console.warn(`[WebLLM] Attempt ${attempt + 1}: Could not parse move from "${raw}"`);
        continue;
      }

      const isOccupied = allMoves.some(([mx, my]) => mx === move[0] && my === move[1]);
      if (isOccupied) {
        console.warn(`[WebLLM] Attempt ${attempt + 1}: Move ${raw} is already occupied`);
        continue;
      }

      return { move, raw };
    } catch (err) {
      console.error(`[WebLLM] Attempt ${attempt + 1} error:`, err);
      if (attempt === maxRetries - 1) {
        return { move: null, raw: '', error: err.message };
      }
    }
  }

  return { move: null, raw: '', error: 'Failed to get a valid move after retries' };
}

function isWebLLMLoaded() {
  return webllmEngine !== null;
}

function getWebLLMLoadedModel() {
  return webllmLoadedModel;
}

export { toNotation, fromNotation, boardToText, WEBLLM_MODELS, loadWebLLMModel, getWebLLMMove, isWebLLMLoaded, getWebLLMLoadedModel };
