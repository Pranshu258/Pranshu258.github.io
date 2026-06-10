import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  CATEGORIES,
  SCHEMA_VERSION,
  canonicalBoardHash,
  cellKey,
  createRng,
  parseArgs,
  sampleCrossPlacement,
  sampleLinePlacement,
  summarizeSamples,
  toNotation,
  validateSample,
} from './golden_lib.mjs';

const DEFAULT_OUT = 'src/renju/eval/golden_set_v1.jsonl';
const DEFAULT_REPORT = 'src/renju/eval/golden_report_v1.json';
const SOURCE = 'synthetic_rule_generator_v1';

function sortedNotation(cells) {
  return cells.map(toNotation).sort();
}

function createBaseSample({ id, category, sideToMove, black, white, bestMoves = [], forbiddenMoves = [], difficulty, notes }) {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    category,
    side_to_move: sideToMove,
    black: sortedNotation(black),
    white: sortedNotation(white),
    best_moves: sortedNotation(bestMoves),
    forbidden_moves: sortedNotation(forbiddenMoves),
    avoid_moves: [],
    value_target: null,
    difficulty,
    source: SOURCE,
    notes,
  };
}

function protectedSet(...groups) {
  const set = new Set();
  for (const group of groups) {
    for (const cell of group) {
      for (let dc = -2; dc <= 2; dc += 1) {
        for (let dr = -2; dr <= 2; dr += 1) {
          set.add(cellKey([cell[0] + dc, cell[1] + dr]));
        }
      }
    }
  }
  return set;
}

function addDistractors({ rng, black, white, protectedCells, sideToMove }) {
  const occupied = new Set([...black, ...white].map(cellKey));
  const addStone = color => {
    for (let attempt = 0; attempt < 400; attempt += 1) {
      const cell = [Math.floor(rng() * 15), Math.floor(rng() * 15)];
      const key = cellKey(cell);
      if (occupied.has(key) || protectedCells.has(key)) continue;
      occupied.add(key);
      color === 'black' ? black.push(cell) : white.push(cell);
      return;
    }
    throw new Error('Unable to add distractor stone');
  };

  const targetBlack = sideToMove === 'black'
    ? Math.max(black.length, white.length)
    : Math.max(black.length, white.length + 1);
  const targetWhite = sideToMove === 'black' ? targetBlack : targetBlack - 1;

  while (black.length < targetBlack) addStone('black');
  while (white.length < targetWhite) addStone('white');
}

function buildImmediateWin(rng, id, index) {
  const sideToMove = index % 2 === 0 ? 'black' : 'white';
  const [a, b, c, d, left, right] = sampleLinePlacement(rng, [[1, 0], [2, 0], [3, 0], [4, 0], [0, 0], [5, 0]]);
  const own = [a, b, c, d];
  const opp = [];
  const black = sideToMove === 'black' ? [...own] : [...opp];
  const white = sideToMove === 'white' ? [...own] : [...opp];
  addDistractors({ rng, black, white, protectedCells: protectedSet(own, [left, right]), sideToMove });
  return createBaseSample({
    id,
    category: 'immediate_win',
    sideToMove,
    black,
    white,
    bestMoves: [left, right],
    difficulty: 1,
    notes: 'The side to move has four contiguous stones and can win at either open endpoint.',
  });
}

function buildForcedBlock(rng, id, index) {
  const sideToMove = index % 2 === 0 ? 'white' : 'black';
  const opponent = sideToMove === 'white' ? 'black' : 'white';
  const [blocker, a, b, c, d, block] = sampleLinePlacement(rng, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  const threat = [a, b, c, d];
  const black = opponent === 'black' ? [...threat] : [blocker];
  const white = opponent === 'white' ? [...threat] : [blocker];
  addDistractors({ rng, black, white, protectedCells: protectedSet([blocker], threat, [block]), sideToMove });
  return createBaseSample({
    id,
    category: 'forced_block',
    sideToMove,
    black,
    white,
    bestMoves: [block],
    difficulty: 1,
    notes: 'The opponent has a half-open four; the side to move must occupy the only winning endpoint.',
  });
}

function buildBrokenFourWin(rng, id, index) {
  const sideToMove = index % 2 === 0 ? 'black' : 'white';
  const [a, b, gap, c, d] = sampleLinePlacement(rng, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  const own = [a, b, c, d];
  const black = sideToMove === 'black' ? [...own] : [];
  const white = sideToMove === 'white' ? [...own] : [];
  addDistractors({ rng, black, white, protectedCells: protectedSet(own, [gap]), sideToMove });
  return createBaseSample({
    id,
    category: 'broken_four_win',
    sideToMove,
    black,
    white,
    bestMoves: [gap],
    difficulty: 2,
    notes: 'The side to move fills the internal gap in a broken four to complete exactly five.',
  });
}

function buildOpenFourCreation(rng, id, index) {
  const sideToMove = index % 2 === 0 ? 'black' : 'white';
  const [openA, a, b, gap, c, openB] = sampleLinePlacement(rng, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  const own = [a, b, c];
  const black = sideToMove === 'black' ? [...own] : [];
  const white = sideToMove === 'white' ? [...own] : [];
  addDistractors({ rng, black, white, protectedCells: protectedSet([openA, openB, gap], own), sideToMove });
  return createBaseSample({
    id,
    category: 'open_four_creation',
    sideToMove,
    black,
    white,
    bestMoves: [gap],
    difficulty: 2,
    notes: 'The side to move fills an internal gap to create an open four with both endpoints available.',
  });
}

function buildFourThreeFork(rng, id, index) {
  const sideToMove = index % 2 === 0 ? 'black' : 'white';
  const [candidate, a, b, c, d, e, openA, openB, openC] = sampleCrossPlacement(
    rng,
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, -1], [-1, 0], [0, 2], [0, -2]],
  );
  const own = [a, b, c, d, e];
  const black = sideToMove === 'black' ? [...own] : [];
  const white = sideToMove === 'white' ? [...own] : [];
  addDistractors({ rng, black, white, protectedCells: protectedSet([candidate, openA, openB, openC], own), sideToMove });
  return createBaseSample({
    id,
    category: 'four_three_fork',
    sideToMove,
    black,
    white,
    bestMoves: [candidate],
    difficulty: 3,
    notes: 'The candidate move creates a four-threat on one axis and an open three on another axis.',
  });
}

function buildWhiteOverlineWin(rng, id) {
  const [a, b, c, gap, d, e] = sampleLinePlacement(rng, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  const black = [];
  const white = [a, b, c, d, e];
  addDistractors({ rng, black, white, protectedCells: protectedSet(white, [gap]), sideToMove: 'white' });
  return createBaseSample({
    id,
    category: 'white_overline_win',
    sideToMove: 'white',
    black,
    white,
    bestMoves: [gap],
    difficulty: 2,
    notes: 'White may legally win with six or more in a row; filling the gap creates an overline win.',
  });
}

function buildFalsePositiveForbidden(rng, id) {
  const [candidate, a, b, openA, openB] = sampleLinePlacement(rng, [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0]]);
  const black = [a, b];
  const white = [];
  addDistractors({ rng, black, white, protectedCells: protectedSet([candidate, openA, openB], black), sideToMove: 'black' });
  return createBaseSample({
    id,
    category: 'false_positive_forbidden',
    sideToMove: 'black',
    black,
    white,
    bestMoves: [candidate],
    difficulty: 3,
    notes: 'The candidate Black move creates one open three and looks dangerous, but it is legal because it does not create a double-three, double-four, or overline.',
  });
}

function buildOverlineForbidden(rng, id) {
  const [a, b, c, d, forbidden, e] = sampleLinePlacement(rng, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]);
  const black = [a, b, c, d, e];
  const white = [];
  addDistractors({ rng, black, white, protectedCells: protectedSet(black, [forbidden]), sideToMove: 'black' });
  return createBaseSample({
    id,
    category: 'overline_forbidden',
    sideToMove: 'black',
    black,
    white,
    forbiddenMoves: [forbidden],
    difficulty: 2,
    notes: 'Black has a gapped six-stone line; filling the gap creates an illegal overline rather than a legal win.',
  });
}

function buildDoubleThreeForbidden(rng, id) {
  const [candidate, a, b, c, d] = sampleCrossPlacement(rng, [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]);
  const black = [a, b, c, d];
  const white = [];
  addDistractors({ rng, black, white, protectedCells: protectedSet([candidate], black), sideToMove: 'black' });
  return createBaseSample({
    id,
    category: 'double_three_forbidden',
    sideToMove: 'black',
    black,
    white,
    forbiddenMoves: [candidate],
    difficulty: 3,
    notes: 'The candidate Black move simultaneously creates two independent open threes.',
  });
}

function buildDoubleFourForbidden(rng, id) {
  const [candidate, a, b, c, d, e, f, openA, openB] = sampleCrossPlacement(
    rng,
    [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [0, 3], [-1, 0], [0, -1]],
  );
  const black = [a, b, c, d, e, f];
  const white = [];
  addDistractors({ rng, black, white, protectedCells: protectedSet([candidate, openA, openB], black), sideToMove: 'black' });
  return createBaseSample({
    id,
    category: 'double_four_forbidden',
    sideToMove: 'black',
    black,
    white,
    forbiddenMoves: [candidate],
    difficulty: 3,
    notes: 'The candidate Black move creates two four-threats at once, which is forbidden under Renju rules.',
  });
}

const BUILDERS = {
  immediate_win: buildImmediateWin,
  forced_block: buildForcedBlock,
  broken_four_win: buildBrokenFourWin,
  open_four_creation: buildOpenFourCreation,
  four_three_fork: buildFourThreeFork,
  white_overline_win: buildWhiteOverlineWin,
  false_positive_forbidden: buildFalsePositiveForbidden,
  overline_forbidden: buildOverlineForbidden,
  double_three_forbidden: buildDoubleThreeForbidden,
  double_four_forbidden: buildDoubleFourForbidden,
};

function generateCategory({ rng, category, count, seen }) {
  const samples = [];
  let attempts = 0;
  while (samples.length < count && attempts < count * 500) {
    attempts += 1;
    const id = `${category}_${String(samples.length + 1).padStart(4, '0')}`;
    const sample = BUILDERS[category](rng, id, samples.length);
    const hash = canonicalBoardHash(sample);
    if (seen.has(hash)) continue;
    const errors = validateSample(sample);
    if (errors.length > 0) continue;
    seen.add(hash);
    samples.push(sample);
  }
  if (samples.length !== count) {
    throw new Error(`Generated ${samples.length}/${count} valid samples for ${category}`);
  }
  return samples;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    out: DEFAULT_OUT,
    report: DEFAULT_REPORT,
    'per-category': '100',
    seed: '258',
  });
  const perCategory = Number(args['per-category']);
  const seed = Number(args.seed);
  if (!Number.isInteger(perCategory) || perCategory <= 0) {
    throw new Error('--per-category must be a positive integer');
  }

  const rng = createRng(seed);
  const seen = new Set();
  const samples = CATEGORIES.flatMap(category => generateCategory({ rng, category, count: perCategory, seen }));
  const jsonl = `${samples.map(sample => JSON.stringify(sample)).join('\n')}\n`;
  const report = {
    ...summarizeSamples(samples),
    generator: SOURCE,
    seed,
    output: args.out,
    validation_errors: 0,
  };

  await mkdir(dirname(args.out), { recursive: true });
  await writeFile(args.out, jsonl);
  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Generated ${samples.length} golden-set samples at ${args.out}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
