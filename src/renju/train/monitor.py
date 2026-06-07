"""
monitor.py  —  Live training monitor.
Watches rl_v2_log.txt, prints new eval results as they arrive,
and updates eval_history.json after each new eval.
"""
import time, os, sys, torch, glob
from parse_evals import parse_log, save, OUT_PATH, LOG_PATH

seen_steps = set()

def status():
    try:
        c = torch.load('checkpoints/rl_v2.pt', map_location='cpu', weights_only=False)
        s   = c['update']
        bd  = c.get('black_depth', '?')
        wd  = c.get('white_depth', '?')
        bwr = c.get('win_rate', 0)
        wwr = c.get('white_wr', 0)
        n   = len(glob.glob('checkpoints/rl_v2_step*.pt'))
        return (f'step={s}/2000  Bd={bd}  Wd={wd}  '
                f'Bwr={bwr:.0%}  Wwr={wwr:.0%}  evals={n}')
    except Exception:
        return '...'

def report(rec):
    pd = rec.get('per_depth', {})
    overall = f"{rec.get('overall_pct','?')}%"
    lines = [
        f"\n{'═'*62}",
        f"  EVAL @ step {rec['step']}   overall={overall}   "
        f"train_wr={rec.get('train_wr','?')}%",
        f"{'─'*62}",
        f"  {'':12} {'d1':>5} {'d2':>5} {'d3':>5} {'d4':>5} {'d5':>5}",
        f"  {'Black':12} " + '  '.join(
            f"{pd.get(f'black_d{d}',{}).get('pct','?'):>4}%" for d in range(1,6)),
        f"  {'White':12} " + '  '.join(
            f"{pd.get(f'white_d{d}',{}).get('pct','?'):>4}%" for d in range(1,6)),
        f"{'═'*62}",
    ]
    print('\n'.join(lines))
    sys.stdout.flush()

# Backfill existing evals
records = parse_log(LOG_PATH)
for r in records:
    seen_steps.add(r['step'])
    report(r)

print(f'\n[{time.strftime("%H:%M")}] Monitoring...  {status()}\n')
last_heartbeat = time.time()

while True:
    records = parse_log(LOG_PATH)
    new = [r for r in records if r['step'] not in seen_steps]
    if new:
        save(records, OUT_PATH)
        for r in new:
            seen_steps.add(r['step'])
            report(r)

    if time.time() - last_heartbeat > 120:
        print(f'[{time.strftime("%H:%M")}] {status()}')
        sys.stdout.flush()
        last_heartbeat = time.time()

    time.sleep(20)
