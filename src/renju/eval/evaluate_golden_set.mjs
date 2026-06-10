import { readFile, writeFile } from 'node:fs/promises';
import { attack } from '../ai.js';
import {
  notationListToPixels,
  parseArgs,
  summarizeSamples,
  toNotation,
  validateSample,
} from './golden_lib.mjs';

const DEFAULT_IN = 'src/renju/eval/golden_set_v1.jsonl';
const DEFAULT_REPORT = 'src/renju/eval/golden_eval_minimax_v1.json';

function pixelToNotation(move) {
  if (!move) return null;
  return toNotation([move[0] / 40, move[1] / 40]);
}

function emptyMetrics() {
  return {
    total: 0,
    labeled: 0,
    top1_correct: 0,
    forbidden_checks: 0,
    forbidden_violations: 0,
    forbidden_avoidance_correct: 0,
  };
}

function addRates(metrics) {
  return {
    ...metrics,
    top1_accuracy: metrics.labeled === 0 ? null : metrics.top1_correct / metrics.labeled,
    forbidden_violation_rate: metrics.forbidden_checks === 0 ? null : metrics.forbidden_violations / metrics.forbidden_checks,
    forbidden_avoidance_accuracy: metrics.forbidden_checks === 0 ? null : metrics.forbidden_avoidance_correct / metrics.forbidden_checks,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    in: DEFAULT_IN,
    report: DEFAULT_REPORT,
    depth: '2',
  });
  const depth = Number(args.depth);
  if (!Number.isInteger(depth) || depth <= 0) throw new Error('--depth must be a positive integer');

  const samples = (await readFile(args.in, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

  const invalid = samples.flatMap(sample => validateSample(sample).map(error => ({ id: sample.id, error })));
  if (invalid.length > 0) {
    throw new Error(`Cannot evaluate invalid golden set; first error: ${invalid[0].id}: ${invalid[0].error}`);
  }

  const overall = emptyMetrics();
  const byCategory = {};
  const examples = [];

  for (const sample of samples) {
    const metrics = byCategory[sample.category] ?? emptyMetrics();
    byCategory[sample.category] = metrics;
    overall.total += 1;
    metrics.total += 1;

    const currentMoves = sample.side_to_move === 'black' ? sample.black : sample.white;
    const opponentMoves = sample.side_to_move === 'black' ? sample.white : sample.black;
    const result = attack(
      notationListToPixels(currentMoves),
      notationListToPixels(opponentMoves),
      0,
      depth,
      -1000,
      1000,
      sample.side_to_move === 'black',
    );
    const predicted = pixelToNotation(result.bestMove);
    const hasBestLabel = sample.best_moves.length > 0;
    const isTop1Correct = hasBestLabel && sample.best_moves.includes(predicted);
    const isForbiddenViolation = sample.forbidden_moves.includes(predicted);

    if (hasBestLabel) {
      overall.labeled += 1;
      metrics.labeled += 1;
      if (isTop1Correct) {
        overall.top1_correct += 1;
        metrics.top1_correct += 1;
      } else if (examples.length < 25) {
        examples.push({
          id: sample.id,
          category: sample.category,
          side_to_move: sample.side_to_move,
          predicted,
          expected: sample.best_moves,
        });
      }
    }

    if (sample.side_to_move === 'black' && sample.forbidden_moves.length > 0) {
      overall.forbidden_checks += 1;
      metrics.forbidden_checks += 1;
      if (isForbiddenViolation) {
        overall.forbidden_violations += 1;
        metrics.forbidden_violations += 1;
      } else {
        overall.forbidden_avoidance_correct += 1;
        metrics.forbidden_avoidance_correct += 1;
      }
    }
  }

  const report = {
    ...summarizeSamples(samples),
    evaluator: 'minimax_attack',
    depth,
    input: args.in,
    overall: addRates(overall),
    by_category: Object.fromEntries(
      Object.entries(byCategory).map(([category, metrics]) => [category, addRates(metrics)]),
    ),
    sample_mismatches: examples,
  };

  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Evaluated ${samples.length} samples at depth ${depth}; report written to ${args.report}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
