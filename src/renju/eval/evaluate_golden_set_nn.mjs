import { readFile, writeFile } from 'node:fs/promises';
import * as ort from 'onnxruntime-node';
import {
  BOARD_CELLS,
  boardToTensor,
  indexToPixel,
  legalPolicyIndices,
  notationListToPixels,
  parseArgs,
  pixelToNotation,
  summarizeSamples,
  validateSample,
} from './golden_lib.mjs';

const DEFAULT_IN = 'src/renju/eval/golden_set_v1.jsonl';
const DEFAULT_REPORT = 'src/renju/eval/golden_eval_deployed_models_v1.json';
const DEFAULT_BLACK_MODEL = 'public/models/renju_black.onnx';
const DEFAULT_WHITE_MODEL = 'public/models/renju_white.onnx';

function emptyMetrics() {
  return {
    total: 0,
    labeled: 0,
    top1_correct: 0,
    top3_correct: 0,
    forbidden_checks: 0,
    forbidden_violations: 0,
    raw_forbidden_top1: 0,
    null_predictions: 0,
    value_sum: 0,
  };
}

function addRates(metrics) {
  return {
    ...metrics,
    top1_accuracy: metrics.labeled === 0 ? null : metrics.top1_correct / metrics.labeled,
    top3_accuracy: metrics.labeled === 0 ? null : metrics.top3_correct / metrics.labeled,
    forbidden_violation_rate: metrics.forbidden_checks === 0 ? null : metrics.forbidden_violations / metrics.forbidden_checks,
    raw_forbidden_top1_rate: metrics.forbidden_checks === 0 ? null : metrics.raw_forbidden_top1 / metrics.forbidden_checks,
    mean_value: metrics.total === 0 ? null : metrics.value_sum / metrics.total,
  };
}

function topKFromLogits(logits, indices, k) {
  return indices
    .map(idx => ({ idx, logit: logits[idx] }))
    .sort((a, b) => b.logit - a.logit)
    .slice(0, k)
    .map(item => item.idx);
}

async function predict(sample, sessions) {
  const isBlack = sample.side_to_move === 'black';
  const playerMoves = notationListToPixels(isBlack ? sample.black : sample.white);
  const opponentMoves = notationListToPixels(isBlack ? sample.white : sample.black);
  const session = isBlack ? sessions.black : sessions.white;
  const tensorData = boardToTensor(playerMoves, opponentMoves, isBlack);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, BOARD_CELLS, BOARD_CELLS]);
  const results = await session.run({ board: inputTensor });
  const logits = results.policy.data;
  const value = Number(results.value.data[0]);

  const deployedLegal = legalPolicyIndices(playerMoves, opponentMoves, isBlack, { excludeForbidden: true });
  const rawLegal = legalPolicyIndices(playerMoves, opponentMoves, isBlack, { excludeForbidden: false });
  const top3 = topKFromLogits(logits, deployedLegal, 3).map(indexToPixel).map(pixelToNotation);
  const rawTop1 = topKFromLogits(logits, rawLegal, 1).map(indexToPixel).map(pixelToNotation)[0] ?? null;

  return {
    top1: top3[0] ?? null,
    top3,
    rawTop1,
    value,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    in: DEFAULT_IN,
    report: DEFAULT_REPORT,
    black: DEFAULT_BLACK_MODEL,
    white: DEFAULT_WHITE_MODEL,
  });

  const samples = (await readFile(args.in, 'utf8'))
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));

  const invalid = samples.flatMap(sample => validateSample(sample).map(error => ({ id: sample.id, error })));
  if (invalid.length > 0) {
    throw new Error(`Cannot evaluate invalid golden set; first error: ${invalid[0].id}: ${invalid[0].error}`);
  }

  const sessions = {
    black: await ort.InferenceSession.create(args.black),
    white: await ort.InferenceSession.create(args.white),
  };

  const overall = emptyMetrics();
  const byCategory = {};
  const examples = [];

  for (const sample of samples) {
    const metrics = byCategory[sample.category] ?? emptyMetrics();
    byCategory[sample.category] = metrics;
    overall.total += 1;
    metrics.total += 1;

    const prediction = await predict(sample, sessions);
    overall.value_sum += prediction.value;
    metrics.value_sum += prediction.value;
    if (!prediction.top1) {
      overall.null_predictions += 1;
      metrics.null_predictions += 1;
    }

    if (sample.best_moves.length > 0) {
      overall.labeled += 1;
      metrics.labeled += 1;
      const top1Correct = sample.best_moves.includes(prediction.top1);
      const top3Correct = prediction.top3.some(move => sample.best_moves.includes(move));
      if (top1Correct) {
        overall.top1_correct += 1;
        metrics.top1_correct += 1;
      }
      if (top3Correct) {
        overall.top3_correct += 1;
        metrics.top3_correct += 1;
      }
      if (!top1Correct && examples.length < 50) {
        examples.push({
          id: sample.id,
          category: sample.category,
          side_to_move: sample.side_to_move,
          predicted: prediction.top1,
          top3: prediction.top3,
          expected: sample.best_moves,
          value: prediction.value,
        });
      }
    }

    if (sample.side_to_move === 'black' && sample.forbidden_moves.length > 0) {
      overall.forbidden_checks += 1;
      metrics.forbidden_checks += 1;
      if (sample.forbidden_moves.includes(prediction.top1)) {
        overall.forbidden_violations += 1;
        metrics.forbidden_violations += 1;
      }
      if (sample.forbidden_moves.includes(prediction.rawTop1)) {
        overall.raw_forbidden_top1 += 1;
        metrics.raw_forbidden_top1 += 1;
      }
    }
  }

  const report = {
    ...summarizeSamples(samples),
    evaluator: 'deployed_onnx_models',
    input: args.in,
    models: {
      black: args.black,
      white: args.white,
    },
    policy_mask: 'browser candidate mask plus forbidden Black move filter',
    overall: addRates(overall),
    by_category: Object.fromEntries(
      Object.entries(byCategory).map(([category, metrics]) => [category, addRates(metrics)]),
    ),
    sample_mismatches: examples,
  };

  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Evaluated ${samples.length} samples against deployed ONNX models; report written to ${args.report}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
