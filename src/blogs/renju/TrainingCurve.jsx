import React from 'react';

// ── Data from golden_training_curve.py (top-1 accuracy on golden_set_v1.jsonl) ──
// Black checkpoints evaluated on 350 black-to-move positions.
const BLACK_PHASES = [
  { name: 'Supervised',      color: 'rgba(90,110,150,0.15)',  labelColor: '#8090b0', pts: [12.0] },
  { name: 'RL vs Minimax',   color: 'rgba(190,130,50,0.15)',  labelColor: '#b07830', pts: [12.0,13.1,12.3,15.1,14.0,14.3,14.6,14.0,14.6,11.4,12.9] },
  { name: 'Black Specialist',color: 'rgba(40,150,80,0.15)',   labelColor: '#28a050', pts: [14.6,13.4,13.4,15.4,14.6,12.9,14.6,14.6,15.7,13.7,15.4,14.6,14.6,14.9,16.6,16.3,15.7,15.4,15.7,14.9,14.6,16.0,15.1,15.1,16.6,14.6,16.3,16.0,15.7,15.7,16.0,15.7,16.0] },
  { name: 'Human FT',        color: 'rgba(190,70,110,0.15)',  labelColor: '#c04070', pts: [16.3] },
  { name: 'Tactical RL v2',  color: 'rgba(50,150,190,0.15)',  labelColor: '#3090b8', pts: [22.3,22.0,23.4,22.9] },
];

// White checkpoints evaluated on 350 white-to-move positions.
const WHITE_PHASES = [
  { name: 'Supervised',      color: 'rgba(90,110,150,0.15)',  labelColor: '#8090b0', pts: [14.6] },
  { name: 'RL vs Minimax',   color: 'rgba(190,130,50,0.15)',  labelColor: '#b07830', pts: [13.1,14.0,14.6,18.6,18.6,18.6,19.1,18.3,19.7,14.3,14.9] },
  { name: 'White Specialist',color: 'rgba(130,70,190,0.15)',  labelColor: '#8040c0', pts: [19.7,14.9,15.4,21.4,20.6,20.6,20.3,20.9,19.4,19.7,20.9,20.6,21.4,20.3,20.3,20.9,20.9,15.4,21.1,21.4,19.7,19.4,21.4,20.9,16.6,19.7,22.3,16.9,16.9] },
  { name: 'Human FT',        color: 'rgba(190,70,110,0.15)',  labelColor: '#c04070', pts: [18.0] },
  { name: 'Tactical RL v2',  color: 'rgba(50,150,190,0.15)',  labelColor: '#3090b8', pts: [26.3,25.4,24.9,26.6] },
];

// ── ELO data from mixed tournament (NN + minimax, 25 games/side) ─────────────
// Minimax models competed directly against NN models; all Elo values are from
// this joint pool. NN starting points anchored to prior NN-only tournament.
const ELO_DATA = [
  { model: 'minimax_d5',     role: 'Minimax · depth 5',            elo: 1945, color: '#f97316', deployed: false, isMinimax: true  },
  { model: 'white_human_ft', role: 'White · human FT',             elo: 1622, color: '#c084f0', deployed: false, isMinimax: false },
  { model: 'black_expert_v2',role: 'Black specialist · deployed',  elo: 1520, color: '#5ba3f5', deployed: true,  isMinimax: false },
  { model: 'minimax_d4',     role: 'Minimax · depth 4',            elo: 1468, color: '#f97316', deployed: false, isMinimax: true  },
  { model: 'black_human_ft', role: 'Black · human FT',             elo: 1415, color: '#5ba3f5', deployed: false, isMinimax: false },
  { model: 'minimax_d3',     role: 'Minimax · depth 3',            elo: 1411, color: '#f97316', deployed: false, isMinimax: true  },
  { model: 'minimax_d1',     role: 'Minimax · depth 1',            elo: 1389, color: '#f97316', deployed: false, isMinimax: true  },
  { model: 'white_expert_v2',role: 'White specialist · deployed',  elo: 1333, color: '#c084f0', deployed: true,  isMinimax: false },
  { model: 'minimax_d2',     role: 'Minimax · depth 2',            elo: 1312, color: '#f97316', deployed: false, isMinimax: true  },
];

// ── Golden set benchmark (1000 positions, top-1 tactical accuracy) ───────────
// NN models evaluated on individual positions; minimax uses full game-tree search.
// Source: golden_tournament.py — golden_set_v1.jsonl (Jun 2025)
const GOLDEN_DATA = [
  // minimax baselines
  { label: 'minimax depth=3', acc: 98, color: '#f97316', group: 'minimax' },
  { label: 'minimax depth=1', acc: 94, color: '#f97316', group: 'minimax' },
  { label: 'minimax depth=4', acc: 86, color: '#f97316', group: 'minimax' },
  { label: 'minimax depth=5', acc: 86, color: '#f97316', group: 'minimax' },
  { label: 'minimax depth=2', acc: 57, color: '#f97316', group: 'minimax' },
  // NN models
  { label: 'black_expert_v2_gym', acc: 30, color: '#5ba3f5', group: 'nn', deployed: false },
  { label: 'deployed pair',       acc: 25, color: '#22c55e', group: 'nn', deployed: true  },
  { label: 'black_expert_v2',    acc: 25, color: '#5ba3f5', group: 'nn', deployed: true  },
  { label: 'white_expert_v2',    acc: 24, color: '#c084f0', group: 'nn', deployed: true  },
  { label: 'black_expert',       acc: 17, color: '#5ba3f5', group: 'nn', deployed: false },
  { label: 'white_human_ft',     acc: 16, color: '#94a3b8', group: 'nn', deployed: false },
  { label: 'black_human_ft',     acc: 16, color: '#94a3b8', group: 'nn', deployed: false },
  { label: 'rl_vs_minimax',      acc: 14, color: '#94a3b8', group: 'nn', deployed: false },
  { label: 'rl_v2',              acc: 15, color: '#94a3b8', group: 'nn', deployed: false },
  { label: 'supervised',         acc: 13, color: '#94a3b8', group: 'nn', deployed: false },
  { label: 'rl_dual',            acc: 11, color: '#94a3b8', group: 'nn', deployed: false },
];

// ── Chart helpers ────────────────────────────────────────────────────────────
function buildPoints(phases) {
  const pts = [];
  phases.forEach(ph => ph.pts.forEach(wr => pts.push(wr)));
  return pts;
}

function buildPhaseRegions(phases, totalPts, PW) {
  const regions = [];
  let x = 0;
  phases.forEach(ph => {
    const w = (ph.pts.length / totalPts) * PW;
    regions.push({ ...ph, x, w });
    x += w;
  });
  return regions;
}

function LineChart({ phases, lineColor, title, yMax = 30 }) {
  const ML = 42, MR = 12, MT = 28, MB = 36;
  const CW = 680, CH = 200;
  const PW = CW - ML - MR;
  const PH = CH - MT - MB;

  const pts     = buildPoints(phases);
  const total   = pts.length;
  const regions = buildPhaseRegions(phases, total, PW);

  const xPos = i => ML + (i / (total - 1)) * PW;
  const yPos = v => MT + PH - (v / yMax) * PH;

  const pathD = pts.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`
  ).join(' ');

  const yTicks = [0, 10, 20, 30].filter(t => t <= yMax);

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', display: 'block' }}>
      {/* Phase backgrounds */}
      {regions.map((r, i) => (
        <rect key={i} x={ML + r.x} y={MT} width={r.w} height={PH}
              fill={r.color} />
      ))}

      {/* Phase label at top */}
      {regions.map((r, i) => (
        <text key={i} x={ML + r.x + r.w / 2} y={MT - 8}
              textAnchor="middle" fontSize="8.5" fill={r.labelColor}
              fontWeight="600">{r.name}</text>
      ))}

      {/* Phase dividers */}
      {regions.slice(1).map((r, i) => (
        <line key={i} x1={ML + r.x} y1={MT} x2={ML + r.x} y2={MT + PH}
              stroke="var(--surface-text-color)" strokeOpacity="0.12" strokeWidth="1"
              strokeDasharray="3,3" />
      ))}

      {/* Y gridlines + labels */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={ML} y1={yPos(v)} x2={ML + PW} y2={yPos(v)}
                stroke="var(--surface-text-color)" strokeOpacity="0.1" strokeWidth="1" />
          <text x={ML - 6} y={yPos(v) + 4} textAnchor="end" fontSize="9"
                fill="var(--surface-text-color)" opacity="0.5">{v}%</text>
        </g>
      ))}

      {/* Chart border */}
      <rect x={ML} y={MT} width={PW} height={PH}
            fill="none" stroke="var(--surface-text-color)" strokeOpacity="0.15" strokeWidth="1" />

      {/* Data line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="1.8"
            strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />

      {/* Dots for single-point phases */}
      {regions.filter(r => r.pts.length === 1).map((r, i) => {
        const idx = buildPoints(phases.slice(0, phases.indexOf(r))).length;
        return (
          <circle key={i} cx={xPos(idx)} cy={yPos(r.pts[0])} r="3"
                  fill={lineColor} opacity="0.9" />
        );
      })}

      {/* Title */}
      <text x={ML + PW / 2} y={CH - 6} textAnchor="middle" fontSize="10"
            fill={lineColor} fontWeight="600" opacity="0.8">{title}</text>
    </svg>
  );
}

function EloChart() {
  const CW = 680, rowH = 40;
  const ML = 178, MR = 68, MT = 20, MB = 8;
  const PW = CW - ML - MR;
  const eloMin = 1250, eloMax = 2000;
  const CH = MT + ELO_DATA.length * rowH + MB;
  const xPos = elo => ML + (elo - eloMin) / (eloMax - eloMin) * PW;
  const ticks = [1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000];

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`}
         style={{ width: '100%', maxWidth: `${CW}px`, display: 'block', overflow: 'visible' }}>

      {/* Gridlines + tick labels */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={xPos(t)} y1={MT - 8} x2={xPos(t)} y2={CH - MB}
                stroke="var(--surface-text-color)" strokeOpacity={0.1} strokeWidth={1} />
          <text x={xPos(t)} y={MT - 10} textAnchor="middle"
                fill="var(--surface-text-color)" fillOpacity={0.35} fontSize={9.5}>
            {t}
          </text>
        </g>
      ))}

      {/* Rows */}
      {ELO_DATA.map(({ model, role, elo, color, deployed, isMinimax }, i) => {
        const y  = MT + (i + 0.5) * rowH;
        const x  = xPos(elo);
        const op = (deployed || isMinimax) ? 1 : 0.42;
        const r  = (deployed || isMinimax) ? 6 : 4.5;
        const fw = (deployed || isMinimax) ? 700 : 400;
        const labelOp = (deployed || isMinimax) ? 0.9 : 0.55;

        return (
          <g key={model}>
            {/* Track line */}
            <line x1={ML} y1={y} x2={CW - MR} y2={y}
                  stroke="var(--surface-text-color)" strokeOpacity={0.06} strokeWidth={1} />
            {/* Stem */}
            <line x1={ML} y1={y} x2={x} y2={y}
                  stroke={color} strokeOpacity={op * 0.7} strokeWidth={(deployed || isMinimax) ? 2 : 1.5} />
            {/* Dot */}
            <circle cx={x} cy={y} r={r} fill={color} fillOpacity={op} />
            {/* Model label */}
            <text x={ML - 10} y={y - 5} textAnchor="end"
                  fill="var(--surface-text-color)" fillOpacity={labelOp}
                  fontSize={10.5} fontFamily="monospace" fontWeight={fw}>
              {model}
            </text>
            <text x={ML - 10} y={y + 7} textAnchor="end"
                  fill="var(--surface-text-color)" fillOpacity={0.35} fontSize={9}>
              {role}
            </text>
            {/* Elo value */}
            <text x={x + 11} y={y + 4}
                  fill={color} fillOpacity={op}
                  fontSize={10.5} fontWeight={(deployed || isMinimax) ? 700 : 500}>
              {elo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function GoldenBenchmark() {
  const CW = 680, rowH = 36;
  const ML = 178, MR = 68, MT = 22, MB = 8;
  const PW = CW - ML - MR;
  const CH = MT + GOLDEN_DATA.length * rowH + MB;
  const xPos = acc => ML + (acc / 100) * PW;
  const ticks = [0, 25, 50, 75, 100];

  // Divider row index: between last minimax and first NN
  const dividerIdx = GOLDEN_DATA.findIndex(d => d.group === 'nn');

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`}
         style={{ width: '100%', maxWidth: `${CW}px`, display: 'block', overflow: 'visible' }}>

      {/* Gridlines + tick labels */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={xPos(t)} y1={MT - 10} x2={xPos(t)} y2={CH - MB}
                stroke="var(--surface-text-color)" strokeOpacity={0.1} strokeWidth={1} />
          <text x={xPos(t)} y={MT - 12} textAnchor="middle"
                fill="var(--surface-text-color)" fillOpacity={0.35} fontSize={9.5}>
            {t}%
          </text>
        </g>
      ))}

      {/* Group separator */}
      <line x1={ML - 10} y1={MT + dividerIdx * rowH - 6}
            x2={CW - MR + 10} y2={MT + dividerIdx * rowH - 6}
            stroke="var(--surface-text-color)" strokeOpacity={0.15} strokeWidth={1}
            strokeDasharray="4,3" />
      <text x={ML - 10} y={MT + dividerIdx * rowH - 8} textAnchor="end"
            fill="var(--surface-text-color)" fillOpacity={0.28} fontSize={8.5}>
        ── Neural Network ──
      </text>

      {/* Rows */}
      {GOLDEN_DATA.map(({ label, acc, color, group, deployed }, i) => {
        const y  = MT + (i + 0.5) * rowH;
        const x  = xPos(acc);
        const isDeployed = deployed === true;
        const isMinimax  = group === 'minimax';
        const op = (isMinimax || isDeployed) ? 1 : 0.45;
        const r  = (isMinimax || isDeployed) ? 6 : 4.5;

        return (
          <g key={label}>
            {/* Track */}
            <line x1={ML} y1={y} x2={CW - MR} y2={y}
                  stroke="var(--surface-text-color)" strokeOpacity={0.06} strokeWidth={1} />
            {/* Stem */}
            <line x1={ML} y1={y} x2={x} y2={y}
                  stroke={color} strokeOpacity={op * 0.65}
                  strokeWidth={(isMinimax || isDeployed) ? 2 : 1.5} />
            {/* Dot */}
            <circle cx={x} cy={y} r={r} fill={color} fillOpacity={op} />
            {/* Label */}
            <text x={ML - 10} y={y + 4} textAnchor="end"
                  fill="var(--surface-text-color)"
                  fillOpacity={(isMinimax || isDeployed) ? 0.9 : 0.5}
                  fontSize={10.5} fontFamily="monospace"
                  fontWeight={(isMinimax || isDeployed) ? 700 : 400}>
              {label}
            </text>
            {/* Value */}
            <text x={x + 10} y={y + 4}
                  fill={color} fillOpacity={op}
                  fontSize={10.5} fontWeight={(isMinimax || isDeployed) ? 700 : 500}>
              {acc}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TrainingCurve() {
  return (
    <div>
      <h3 style={{ margin: '24px 0 4px', fontSize: '1rem', fontWeight: 700,
                   color: 'var(--surface-text-color)' }}>
        Training Progress
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '12px' }}>
        Top-1 accuracy on the golden set (1,000 curated positions) evaluated at every training
        checkpoint. Black and White models scored on their respective color positions (350 each).
        Each phase has a distinct background. Vertical dashes mark phase boundaries.
      </p>
      <div style={{
        background: 'var(--blog-surface-background)',
        border: '1px solid color-mix(in srgb, var(--surface-text-color) 12%, transparent)',
        borderRadius: '10px', padding: '12px 8px 4px',
      }}>
        <LineChart phases={BLACK_PHASES} lineColor="#5ba3f5" title="Black model — golden set top-1 accuracy (black positions)" yMax={30} />
        <div style={{ height: '8px' }} />
        <LineChart phases={WHITE_PHASES} lineColor="#c084f0" title="White model — golden set top-1 accuracy (white positions)" yMax={30} />
      </div>

      <h3 style={{ margin: '28px 0 8px', fontSize: '1rem', fontWeight: 700,
                   color: 'var(--surface-text-color)' }}>
        Elo Ratings
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '12px' }}>
        Mixed round-robin tournament (25 games/side, temperature 0.3) including both NN models and
        minimax at depths 1–5. All Elo values are from this joint pool; NN starting points were
        anchored to a prior NN-only tournament. Minimax shown in orange; deployed NN models in full
        opacity. Note: depth=2 ranks below depth=1 — a known horizon-effect anomaly at even search depths.
      </p>
      <div style={{
        background: 'var(--blog-surface-background)',
        border: '1px solid color-mix(in srgb, var(--surface-text-color) 12%, transparent)',
        borderRadius: '10px', padding: '16px 8px 8px',
      }}>
        <EloChart />
      </div>

      <h3 style={{ margin: '28px 0 8px', fontSize: '1rem', fontWeight: 700,
                   color: 'var(--surface-text-color)' }}>
        Tactical Benchmark
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '12px' }}>
        Top-1 accuracy on 1,000 curated positions (golden set v1) covering immediate wins,
        forced blocks, forks, and forbidden-move handling. Minimax and all key training
        checkpoints evaluated under identical conditions. Deployed models and minimax shown
        at full opacity.
      </p>
      <div style={{
        background: 'var(--blog-surface-background)',
        border: '1px solid color-mix(in srgb, var(--surface-text-color) 12%, transparent)',
        borderRadius: '10px', padding: '16px 8px 8px',
      }}>
        <GoldenBenchmark />
      </div>
    </div>
  );
}
