import { readFile, writeFile } from 'node:fs/promises';
import { canonicalBoardHash, parseArgs, summarizeSamples, validateSample } from './golden_lib.mjs';

const DEFAULT_IN = 'src/renju/eval/golden_set_v1.jsonl';
const DEFAULT_REPORT = 'src/renju/eval/golden_report_v1.json';

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    in: DEFAULT_IN,
    report: DEFAULT_REPORT,
  });
  const lines = (await readFile(args.in, 'utf8')).split('\n').filter(Boolean);
  const samples = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid JSON on line ${index + 1}: ${error.message}`);
    }
  });

  const seen = new Set();
  const errors = [];
  samples.forEach((sample, index) => {
    const line = index + 1;
    const hash = canonicalBoardHash(sample);
    if (seen.has(hash)) errors.push({ line, id: sample.id, errors: ['duplicate canonical board'] });
    seen.add(hash);
    const sampleErrors = validateSample(sample);
    if (sampleErrors.length > 0) errors.push({ line, id: sample.id, errors: sampleErrors });
  });

  const report = {
    ...summarizeSamples(samples),
    input: args.in,
    validation_errors: errors.length,
    errors,
  };
  await writeFile(args.report, `${JSON.stringify(report, null, 2)}\n`);
  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} invalid samples. See ${args.report}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${samples.length} golden-set samples from ${args.in}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
