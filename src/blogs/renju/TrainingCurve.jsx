import React from 'react';

// ── Data from eval_all_checkpoints.py (temp=0.3, 30 games vs minimax depth-3) ──
const BLACK_PHASES = [
  { name: 'Supervised',      color: 'rgba(90,110,150,0.15)',  labelColor: '#8090b0', pts: [26.7] },
  { name: 'RL vs Minimax',   color: 'rgba(190,130,50,0.15)',  labelColor: '#b07830', pts: [70.0,43.3,40.0,13.3,13.3,20.0,23.3,83.3,53.3,100.0,60.0] },
  { name: 'Black Specialist',color: 'rgba(40,150,80,0.15)',   labelColor: '#28a050', pts: [100.0,100.0,100.0,86.7,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0,100.0] },
  { name: 'Human FT',        color: 'rgba(190,70,110,0.15)',  labelColor: '#c04070', pts: [100.0] },
  { name: 'Tactical RL',     color: 'rgba(50,150,190,0.15)',  labelColor: '#3090b8', pts: [100.0,100.0,100.0,96.7] },
];

const WHITE_PHASES = [
  { name: 'Supervised',      color: 'rgba(90,110,150,0.15)',  labelColor: '#8090b0', pts: [0.0] },
  { name: 'RL vs Minimax',   color: 'rgba(190,130,50,0.15)',  labelColor: '#b07830', pts: [0.0,6.7,13.3,86.7,90.0,93.3,86.7,23.3,63.3,20.0,0.0] },
  { name: 'White Specialist',color: 'rgba(130,70,190,0.15)',  labelColor: '#8040c0', pts: [100.0,13.3,3.3,100.0,90.0,100.0,66.7,100.0,100.0,100.0,90.0,50.0,93.3,100.0,100.0,83.3,70.0,0.0,90.0,90.0,100.0,100.0,100.0,90.0,3.3,96.7,90.0,3.3,0.0] },
  { name: 'Human FT',        color: 'rgba(190,70,110,0.15)',  labelColor: '#c04070', pts: [100.0] },
  { name: 'Tactical RL',     color: 'rgba(50,150,190,0.15)',  labelColor: '#3090b8', pts: [86.7,83.3,93.3,96.7] },
];

// ── ELO data from latest tournament ─────────────────────────────────────────
const ELO_DATA = [
  { model: 'black_expert_v2',           role: 'Black specialist · deployed', elo: 1603, color: '#5ba3f5', deployed: true  },
  { model: 'white_expert_v2',           role: 'White specialist · deployed', elo: 1553, color: '#c084f0', deployed: true  },
  { model: 'white_expert_v2 (pre-gym)', role: 'White specialist · pre-gym',  elo: 1550, color: '#c084f0', deployed: false },
  { model: 'black_expert_v2 (pre-gym)', role: 'Black specialist · pre-gym',  elo: 1535, color: '#5ba3f5', deployed: false },
  { model: 'white_human_ft',            role: 'White · human FT only',       elo: 1422, color: '#94a3b8', deployed: false },
  { model: 'black_human_ft',            role: 'Black · human FT only',       elo: 1337, color: '#94a3b8', deployed: false },
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

function LineChart({ phases, lineColor, title }) {
  const ML = 42, MR = 12, MT = 28, MB = 36;
  const CW = 680, CH = 200;
  const PW = CW - ML - MR;
  const PH = CH - MT - MB;

  const pts     = buildPoints(phases);
  const total   = pts.length;
  const regions = buildPhaseRegions(phases, total, PW);

  const xPos = i => ML + (i / (total - 1)) * PW;
  const yPos = v => MT + PH - (v / 100) * PH;

  const pathD = pts.map((v, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`
  ).join(' ');

  // Y gridlines
  const yTicks = [0, 25, 50, 75, 100];

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
  const ML = 178, MR = 52, MT = 20, MB = 8;
  const PW = CW - ML - MR;
  const eloMin = 1270, eloMax = 1660;
  const CH = MT + ELO_DATA.length * rowH + MB;
  const xPos = elo => ML + (elo - eloMin) / (eloMax - eloMin) * PW;
  const ticks = [1300, 1400, 1500, 1600];

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
      {ELO_DATA.map(({ model, role, elo, color, deployed }, i) => {
        const y   = MT + (i + 0.5) * rowH;
        const x   = xPos(elo);
        const op  = deployed ? 1 : 0.42;
        const r   = deployed ? 6 : 4.5;

        return (
          <g key={model}>
            {/* Track line */}
            <line x1={ML} y1={y} x2={CW - MR} y2={y}
                  stroke="var(--surface-text-color)" strokeOpacity={0.06} strokeWidth={1} />
            {/* Stem */}
            <line x1={ML} y1={y} x2={x} y2={y}
                  stroke={color} strokeOpacity={op * 0.7} strokeWidth={deployed ? 2 : 1.5} />
            {/* Dot */}
            <circle cx={x} cy={y} r={r} fill={color} fillOpacity={op} />
            {/* Model label */}
            <text x={ML - 10} y={y - 5} textAnchor="end"
                  fill="var(--surface-text-color)" fillOpacity={deployed ? 0.9 : 0.55}
                  fontSize={10.5} fontFamily="monospace" fontWeight={deployed ? 700 : 400}>
              {model}
            </text>
            <text x={ML - 10} y={y + 7} textAnchor="end"
                  fill="var(--surface-text-color)" fillOpacity={0.35} fontSize={9}>
              {role}
            </text>
            {/* Elo value */}
            <text x={x + 11} y={y + 4}
                  fill={color} fillOpacity={deployed ? 1 : 0.65}
                  fontSize={10.5} fontWeight={deployed ? 700 : 500}>
              {elo}
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
        Win rate vs minimax depth-3 (30 games, temperature 0.3) across all training checkpoints.
        Each phase has a distinct background. Vertical dashes mark phase boundaries.
      </p>
      <div style={{
        background: 'var(--blog-surface-background)',
        border: '1px solid color-mix(in srgb, var(--surface-text-color) 12%, transparent)',
        borderRadius: '10px', padding: '12px 8px 4px',
      }}>
        <LineChart phases={BLACK_PHASES} lineColor="#5ba3f5" title="Black model — win rate as Black" />
        <div style={{ height: '8px' }} />
        <LineChart phases={WHITE_PHASES} lineColor="#c084f0" title="White model — win rate as White" />
      </div>

      <h3 style={{ margin: '28px 0 8px', fontSize: '1rem', fontWeight: 700,
                   color: 'var(--surface-text-color)' }}>
        Elo Ratings
      </h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.6, marginBottom: '12px' }}>
        Round-robin tournament (50 games per pair, temperature 0.3). Elo baseline = 1500.
        A 200-point gap ≈ 76% win rate for the stronger model. Deployed models shown at full opacity.
      </p>
      <div style={{
        background: 'var(--blog-surface-background)',
        border: '1px solid color-mix(in srgb, var(--surface-text-color) 12%, transparent)',
        borderRadius: '10px', padding: '16px 8px 8px',
      }}>
        <EloChart />
      </div>
    </div>
  );
}
