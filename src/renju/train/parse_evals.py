"""
parse_evals.py
Parses rl_v2_log.txt and writes eval_history.json — one entry per checkpoint eval.
Run standalone to backfill, or import parse_log() to call from the monitor.
"""
import json, re, os, sys

LOG_PATH  = 'checkpoints/rl_v2_log.txt'
OUT_PATH  = 'checkpoints/eval_history.json'

def parse_log(log_path=LOG_PATH):
    """Return list of eval dicts sorted by step."""
    if not os.path.exists(log_path):
        return []
    text = open(log_path).read()

    records = []
    # Split into eval blocks by "Model:" header
    blocks = re.split(r'(?=^Model:)', text, flags=re.MULTILINE)
    for block in blocks:
        if 'Overall NN win rate' not in block:
            continue
        rec = {}
        # Step
        m = re.search(r'step=(\d+)', block)
        if not m: continue
        rec['step'] = int(m.group(1))
        # Train wr
        m = re.search(r'train_wr=(\d+)%', block)
        rec['train_wr'] = int(m.group(1)) if m else None
        # Overall
        m = re.search(r'Overall NN win rate: (\d+)/(\d+)', block)
        if m:
            rec['overall_wins'] = int(m.group(1))
            rec['overall_games'] = int(m.group(2))
            rec['overall_pct'] = round(100 * int(m.group(1)) / int(m.group(2)), 1)
        # Per-depth rows: "NN(Black) vs minimax(d=N)  W=X ... win_rate=Y%"
        per_depth = {}
        for row in re.finditer(
            r'NN\((Black|White)\) vs minimax\(d=(\d+)\)\s+W=\s*(\d+).*?win_rate=(\d+)%',
            block
        ):
            color, depth, wins, pct = row.group(1), int(row.group(2)), int(row.group(3)), int(row.group(4))
            key = f'{color.lower()}_d{depth}'
            per_depth[key] = {'wins': wins, 'pct': pct}
        rec['per_depth'] = per_depth
        records.append(rec)

    # Deduplicate by step (keep last)
    seen = {}
    for r in records:
        seen[r['step']] = r
    return sorted(seen.values(), key=lambda x: x['step'])


def save(records, out_path=OUT_PATH):
    with open(out_path, 'w') as f:
        json.dump(records, f, indent=2)
    print(f'Saved {len(records)} eval records → {out_path}')


if __name__ == '__main__':
    records = parse_log()
    save(records)
    # Pretty print summary
    print(f'\n{"Step":>5}  {"Overall":>8}  Black d1-d4          White d1-d4')
    print('─' * 70)
    for r in records:
        overall = f"{r.get('overall_pct','?')}%"
        pd = r.get('per_depth', {})
        brow = '  '.join(f"d{d}:{pd.get(f'black_d{d}',{}).get('pct','?')}%" for d in [1,2,3,4,5])
        wrow = '  '.join(f"d{d}:{pd.get(f'white_d{d}',{}).get('pct','?')}%" for d in [1,2,3,4,5])
        print(f"{r['step']:>5}  {overall:>8}  B:[{brow}]  W:[{wrow}]")
