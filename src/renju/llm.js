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
 * Build a structured board representation optimized for LLM comprehension.
 * Instead of an ASCII grid (which LLMs struggle to parse spatially),
 * we provide:
 *   1. Stone list with coordinates
 *   2. Per-stone neighborhood context (what's adjacent in each direction)
 *   3. Key lines/patterns described in natural language
 */
function boardToStructured(blackMoves, whiteMoves) {
  const attackerGrid = new Set();
  const defenderGrid = new Set();
  const occupiedGrid = new Set();

  for (const [x, y] of blackMoves) {
    const key = `${x / GRID_SIZE},${y / GRID_SIZE}`;
    attackerGrid.add('B:' + key);
    occupiedGrid.add(key);
  }
  for (const [x, y] of whiteMoves) {
    const key = `${x / GRID_SIZE},${y / GRID_SIZE}`;
    defenderGrid.add('W:' + key);
    occupiedGrid.add(key);
  }

  const sections = [];

  // 1. Stone positions as lists
  const blackNotations = blackMoves.map(([x, y]) => toNotation(x, y));
  const whiteNotations = whiteMoves.map(([x, y]) => toNotation(x, y));
  sections.push(`Black (X) stones: ${blackNotations.length ? blackNotations.join(', ') : 'none'}`);
  sections.push(`White (O) stones: ${whiteNotations.length ? whiteNotations.join(', ') : 'none'}`);
  sections.push(`Empty intersections: ${225 - blackMoves.length - whiteMoves.length}`);

  // 2. Describe lines for each player
  const DIRS = [
    { dc: 1, dr: 0, name: 'horizontal' },
    { dc: 0, dr: 1, name: 'vertical' },
    { dc: 1, dr: 1, name: 'diagonal (↘)' },
    { dc: 1, dr: -1, name: 'diagonal (↗)' },
  ];

  function describeLines(moves, label) {
    if (moves.length < 2) return [];
    const moveSet = new Set(moves.map(([x, y]) => `${x / GRID_SIZE},${y / GRID_SIZE}`));
    const lines = [];
    const seen = new Set();

    for (const [x, y] of moves) {
      const col = x / GRID_SIZE, row = y / GRID_SIZE;
      for (const { dc, dr, name } of DIRS) {
        // Walk backward to find start of connected group
        let sc = col, sr = row;
        while (moveSet.has(`${sc - dc},${sr - dr}`)) { sc -= dc; sr -= dr; }

        // Walk forward to collect chain
        const chain = [];
        let c = sc, r = sr;
        while (moveSet.has(`${c},${r}`)) {
          chain.push(toNotation(c * GRID_SIZE, r * GRID_SIZE));
          c += dc; r += dr;
        }

        if (chain.length < 2) continue;
        const key = chain.join('-');
        if (seen.has(key)) continue;
        seen.add(key);

        // Check open ends
        const beforeOpen = (sc - dc >= 0 && sc - dc <= 14 && sr - dr >= 0 && sr - dr <= 14 && !occupiedGrid.has(`${sc - dc},${sr - dr}`));
        const afterOpen = (c >= 0 && c <= 14 && r >= 0 && r <= 14 && !occupiedGrid.has(`${c},${r}`));
        const ends = beforeOpen && afterOpen ? 'both ends open' : (beforeOpen || afterOpen) ? 'one end open' : 'blocked';

        lines.push(`${label} ${name} ${chain.length}-in-a-row: ${chain.join('-')} (${ends})`);
      }
    }
    return lines;
  }

  const blackLines = describeLines(blackMoves, 'Black');
  const whiteLines = describeLines(whiteMoves, 'White');
  const allLines = [...blackLines, ...whiteLines];
  if (allLines.length > 0) {
    sections.push('\nLines on the board:\n' + allLines.join('\n'));
  }

  return sections.join('\n');
}

/**
 * Build a text representation of the board (ASCII grid).
 * Kept as a compact secondary reference.
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
 * Build a move-history string with one move per line: "1. H8 (Black)\n2. I9 (White)\n\u2026"
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
  return moves.join('\n');
}

/**
 * Analyze board for threats: lines of N stones with open ends.
 * Detects both consecutive lines AND broken patterns (e.g. XX_X, X_XX).
 * Returns array of { count, openEnds, blockingMoves: [notation], stones: [notation], broken: boolean }
 */
function findThreats(attackerMoves, defenderMoves, allOccupied) {
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const attackerSet = new Set();
  const occupiedSet = new Set();

  for (const [x, y] of attackerMoves) {
    attackerSet.add(`${x / GRID_SIZE},${y / GRID_SIZE}`);
  }
  for (const [x, y] of defenderMoves) {
    // just need occupiedSet
  }
  for (const [x, y] of allOccupied) {
    occupiedSet.add(`${x / GRID_SIZE},${y / GRID_SIZE}`);
  }

  const threats = [];
  const seen = new Set();

  // Sliding window approach: scan every line of 5 in each direction
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      for (const [dc, dr] of DIRS) {
        // Check if a window of 5 fits on the board
        const endC = col + 4 * dc, endR = row + 4 * dr;
        if (endC < 0 || endC > 14 || endR < 0 || endR > 14) continue;

        const stones = [];
        const empties = [];
        let blocked = false;

        for (let i = 0; i < 5; i++) {
          const c = col + i * dc, r = row + i * dr;
          const key = `${c},${r}`;
          if (attackerSet.has(key)) {
            stones.push([c, r]);
          } else if (!occupiedSet.has(key)) {
            empties.push([c, r]);
          } else {
            blocked = true;
            break;
          }
        }

        if (blocked) continue;
        if (stones.length < 3) continue;

        const sortedKey = stones.map(([a, b]) => `${a},${b}`).sort().join('|') + `|${dc},${dr}`;
        if (seen.has(sortedKey)) continue;
        seen.add(sortedKey);

        // Blocking moves = open cells immediately adjacent to the stone group's ends
        // (NOT the window empties, which may be far from the actual stones)
        const blockingMoves = [];
        const firstStone = stones[0];
        const lastStone = stones[stones.length - 1];
        const beforeC = firstStone[0] - dc, beforeR = firstStone[1] - dr;
        if (beforeC >= 0 && beforeC <= 14 && beforeR >= 0 && beforeR <= 14 && !occupiedSet.has(`${beforeC},${beforeR}`)) {
          blockingMoves.push(toNotation(beforeC * GRID_SIZE, beforeR * GRID_SIZE));
        }
        const afterC = lastStone[0] + dc, afterR = lastStone[1] + dr;
        if (afterC >= 0 && afterC <= 14 && afterR >= 0 && afterR <= 14 && !occupiedSet.has(`${afterC},${afterR}`)) {
          blockingMoves.push(toNotation(afterC * GRID_SIZE, afterR * GRID_SIZE));
        }

        // Count open ends from the stone group (not the window)
        const openEnds = blockingMoves.length;

        threats.push({
          count: stones.length,
          openEnds,
          broken: empties.length > 0 && stones.length >= 3,
          blockingMoves,
          stones: stones.map(([a, b]) => toNotation(a * GRID_SIZE, b * GRID_SIZE))
        });
      }
    }
  }

  // Sort by severity: longer lines first, then more open ends, then prefer non-broken
  threats.sort((a, b) => b.count - a.count || b.openEnds - a.openEnds || (a.broken ? 1 : 0) - (b.broken ? 1 : 0));
  return threats;
}



/**
 * Build the system + user prompt for the LLM.
 * The LLM always plays Black (X). White (O) is the opponent.
 *
 * Design: small on-device models (1-4B params) hallucinate spatial reasoning,
 * so we keep the prompt short, directive, and provide concrete move options
 * when critical threats exist. No chain-of-thought — just pick a move.
 */
function buildPrompt(blackMoves, whiteMoves, llmColor, threatHints = true) {
  const structured = boardToStructured(blackMoves, whiteMoves);
  const history = moveHistoryText(blackMoves, whiteMoves);
  const totalMoves = blackMoves.length + whiteMoves.length;

  let urgentDirective = '';
  let threatSection = '';

  if (threatHints) {
    const allOccupied = [...blackMoves, ...whiteMoves];
    const occupiedSet = new Set(allOccupied.map(([x, y]) => `${x / GRID_SIZE},${y / GRID_SIZE}`));

    const whiteThreats = findThreats(whiteMoves, blackMoves, allOccupied);
    const blackThreats = findThreats(blackMoves, whiteMoves, allOccupied);

    // Check for winning move (Black has 4 in a row)
    const blackWins = blackThreats.filter(t => t.count >= 4 && t.blockingMoves.length > 0);
    if (blackWins.length > 0) {
      urgentDirective = `YOU CAN WIN NOW! Play ${blackWins[0].blockingMoves[0]} to complete 5 in a row.`;
    }

    // Check for must-block (White has 4 in a row)
    const whiteFours = whiteThreats.filter(t => t.count >= 4 && t.blockingMoves.length > 0);
    if (!urgentDirective && whiteFours.length > 0) {
      const blocks = whiteFours[0].blockingMoves;
      urgentDirective = `URGENT: White has ${whiteFours[0].count} in a row at ${whiteFours[0].stones.join(',')}. You MUST block at ${blocks.join(' or ')} or you lose.`;
    }

    // Check for White open three (should block)
    const whiteOpenThrees = whiteThreats.filter(t => t.count === 3 && t.openEnds === 2 && t.blockingMoves.length > 0);
    if (!urgentDirective && whiteOpenThrees.length > 0) {
      const t = whiteOpenThrees[0];
      urgentDirective = `White has an open three at ${t.stones.join(',')}. Block at ${t.blockingMoves.join(' or ')} — otherwise White gets an unstoppable four.`;
    }

    // Non-urgent info — always tell the LLM WHERE to play, not just what exists
    const parts = [];
    const blackOpenThrees = blackThreats.filter(t => t.count === 3 && t.openEnds >= 2 && t.blockingMoves.length > 0);
    if (blackOpenThrees.length > 0) {
      const t = blackOpenThrees[0];
      parts.push(`You have an open three at ${t.stones.join(',')}. Extend it by playing ${t.blockingMoves.join(' or ')}.`);
    }
    // Only show white threats if not already in urgentDirective
    if (!urgentDirective) {
      const whiteClosedThrees = whiteThreats.filter(t => t.count === 3 && t.openEnds === 1 && t.blockingMoves.length > 0);
      if (whiteClosedThrees.length > 0) {
        const t = whiteClosedThrees[0];
        parts.push(`White has a three at ${t.stones.join(',')} (one end open). Consider blocking at ${t.blockingMoves[0]}.`);
      }
    }
    if (parts.length > 0) {
      threatSection = parts.join('\n');
    }
  }

  const system = `You play Black (X) in Renju on a 15×15 board. Columns A-O, rows 1-15.
White (O) is your opponent. Get exactly 5 in a row to win.

Geometry reminders:
- Same row = horizontal (e.g. G7,H7,I7 are horizontal neighbors)
- Same column = vertical (e.g. H6,H7,H8 are vertical neighbors)
- Diagonal: column and row both change by 1

Rules:
- You MUST play on an EMPTY intersection — never on an occupied square
- Block White's 4-in-a-row immediately or you lose
- Block White's open 3-in-a-row or it becomes unstoppable
- Build your own lines toward 5

Respond with ONLY a coordinate like H8. Nothing else.`;

  // Build user prompt — short and direct
  let userParts = [];
  userParts.push(structured);
  userParts.push(`Move history:\n${history || 'none'}`);

  if (urgentDirective) {
    userParts.push(urgentDirective);
  }
  if (threatSection) {
    userParts.push(threatSection);
  }

  userParts.push('Your move:');

  const user = userParts.join('\n\n');

  return { system, user };
}

/**
 * Parse the LLM response text to extract a move coordinate.
 * Supports chain-of-thought: takes the LAST valid coordinate in the response,
 * since the LLM reasons first and outputs the final move at the end.
 */
function parseLLMMove(responseText) {
  // Try exact match first (single coordinate response)
  const trimmed = responseText.trim();
  const exact = fromNotation(trimmed);
  if (exact) return exact;

  // Search for all coordinate patterns like A1-O15 in the text
  const regex = /\b([A-Oa-o])(1[0-5]|[1-9])\b/g;
  let match;
  let lastValid = null;
  while ((match = regex.exec(responseText)) !== null) {
    const result = fromNotation(match[0]);
    if (result) lastValid = result;
  }

  // Also check the very last line for a standalone coordinate
  const lines = trimmed.split('\n').filter(l => l.trim());
  if (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    const lastLineMatch = fromNotation(lastLine);
    if (lastLineMatch) return lastLineMatch;
  }

  return lastValid;
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
  console.log(`[LLM] User prompt:\n${user}`);

  // Build conversation with feedback on failed attempts
  const messages = [
    { role: 'developer', content: system },
    { role: 'user', content: user },
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          messages,
          max_completion_tokens: 32,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[LLM] Azure API error ${res.status}:`, errBody);
        throw new Error(`LLM call failed (${res.status})`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? '';
      console.log(`[LLM] Response (attempt ${attempt + 1}):`, raw);
      const move = parseLLMMove(raw);

      if (!move) {
        console.warn(`[LLM] Attempt ${attempt + 1}: Could not parse move from "${raw}"`);
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: `Invalid. Reply with ONLY a coordinate like H8 (column A-O, row 1-15). Nothing else.` });
        continue;
      }

      // Validate the move is on an empty intersection
      const isOccupied = allMoves.some(([mx, my]) => mx === move[0] && my === move[1]);
      if (isOccupied) {
        const notation = toNotation(move[0], move[1]);
        console.warn(`[LLM] Attempt ${attempt + 1}: Move ${notation} is already occupied`);
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: `${notation} is occupied. Occupied: ${allMoves.map(([x, y]) => toNotation(x, y)).join(', ')}. Pick a DIFFERENT empty square.` });
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
  // Tiny (≤1.5B)
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 1B', size: '~0.7 GB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Qwen2.5 1.5B', size: '~1 GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', label: 'SmolLM2 1.7B', size: '~1 GB' },
  // Small (2-3B)
  { id: 'Qwen3-1.7B-q4f16_1-MLC', label: 'Qwen3 1.7B', size: '~1.2 GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', label: 'Gemma 2 2B', size: '~1.5 GB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', label: 'Llama 3.2 3B', size: '~2 GB' },
  // Medium (3-4B)
  { id: 'Qwen3-4B-q4f16_1-MLC', label: 'Qwen3 4B', size: '~2.5 GB' },
  { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', label: 'Phi-3.5 Mini 3.8B', size: '~2.5 GB' },
  // Large (9B) — needs beefy GPU
  { id: 'gemma-2-9b-it-q4f16_1-MLC', label: 'Gemma 2 9B', size: '~6 GB' },
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
  console.log(`[WebLLM] User prompt:\n${user}`);

  // Qwen3 models use thinking mode by default — disable it for short responses
  const isQwen3 = webllmLoadedModel?.startsWith('Qwen3');
  const userContent = isQwen3 ? `${user}\n\n/no_think` : user;

  // Build conversation with feedback on failed attempts
  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: userContent },
  ];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const reply = await webllmEngine.chat.completions.create({
        messages,
        max_tokens: 16,
        temperature: 0.2,
      });

      const raw = reply.choices?.[0]?.message?.content ?? '';
      console.log(`[WebLLM] Response (attempt ${attempt + 1}):`, raw);

      const move = parseLLMMove(raw);
      if (!move) {
        console.warn(`[WebLLM] Attempt ${attempt + 1}: Could not parse move from "${raw}"`);
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: `Invalid. Reply with ONLY a coordinate like H8. Nothing else.` });
        continue;
      }

      const isOccupied = allMoves.some(([mx, my]) => mx === move[0] && my === move[1]);
      if (isOccupied) {
        const notation = toNotation(move[0], move[1]);
        console.warn(`[WebLLM] Attempt ${attempt + 1}: Move ${notation} is already occupied`);
        messages.push({ role: 'assistant', content: raw });
        messages.push({ role: 'user', content: `${notation} is occupied. Pick a DIFFERENT empty square. Reply with ONLY the coordinate.` });
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
