import React, { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/kda.css';

/* -------------------------------------------------------------------------
   Small equation helper (KaTeX)
   ------------------------------------------------------------------------- */
function Eq({ tex, display = false }) {
    return (
        <span
            className="kda-eq"
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, { displayMode: display, throwOnError: false })
            }}
        />
    );
}

/* -------------------------------------------------------------------------
   Math helpers — everything below computes real numbers so the figures show
   the equations genuinely "in action" rather than a hand-drawn mock-up.
   ------------------------------------------------------------------------- */
const DK = 4;   // key dimension
const DV = 3;   // value dimension
const N = 6;    // sequence length
const C = 3;    // chunk size

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const swish = (x) => x * sigmoid(x);

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const l2norm = (v) => {
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
};

function zeros(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
}
const cloneM = (M) => M.map((r) => r.slice());

// S is DK x DV (rows = key channels, cols = value channels)
const decay = (S, alpha) => S.map((row, i) => row.map((x) => x * alpha[i]));
function erase(S, k, beta) {                    // (I - beta k k^T) S
    const kS = Array(DV).fill(0);               // k^T S  -> length DV
    for (let j = 0; j < DV; j++) for (let i = 0; i < DK; i++) kS[j] += k[i] * S[i][j];
    return S.map((row, i) => row.map((x, j) => x - beta * k[i] * kS[j]));
}
const write = (S, k, v, beta) => S.map((row, i) => row.map((x, j) => x + beta * k[i] * v[j]));
function readOut(S, q) {                         // o = S^T q  -> length DV
    const o = Array(DV).fill(0);
    for (let j = 0; j < DV; j++) for (let i = 0; i < DK; i++) o[j] += q[i] * S[i][j];
    return o;
}

/* Build the shared model: tokens + full recurrence trace + chunk boundaries */
function buildModel() {
    const rnd = mulberry32(7);
    const g = () => rnd() * 2 - 1;

    const tokens = [];
    for (let t = 0; t < N; t++) {
        const q = l2norm(Array.from({ length: DK }, g));
        const k = l2norm(Array.from({ length: DK }, g));
        const v = Array.from({ length: DV }, () => swish(g() * 1.6));
        const beta = sigmoid(g() * 1.5);
        // channel-wise, lower-bounded retention factor in ~(0.6, 0.98)
        const alpha = Array.from({ length: DK }, () => 0.6 + 0.38 * sigmoid(g() * 1.4));
        tokens.push({ q, k, v, beta, alpha });
    }

    // initial state carried in from earlier context (non-zero so decay is visible)
    const rnd2 = mulberry32(21);
    const S0 = zeros(DK, DV).map((row) => row.map(() => (rnd2() * 2 - 1) * 0.5));

    // per-token phase frames + state after each token
    const frames = [];
    const sAfter = [];
    let S = cloneM(S0);
    for (let t = 0; t < N; t++) {
        const { q, k, v, beta, alpha } = tokens[t];
        const sDecay = decay(S, alpha);
        const sErase = erase(sDecay, k, beta);
        const sWrite = write(sErase, k, v, beta);
        const out = readOut(sWrite, q);
        frames.push({ t, phase: 'decay', S: cloneM(sDecay), out: null });
        frames.push({ t, phase: 'erase', S: cloneM(sErase), out: null });
        frames.push({ t, phase: 'write', S: cloneM(sWrite), out: null });
        frames.push({ t, phase: 'read', S: cloneM(sWrite), out });
        S = sWrite;
        sAfter.push(cloneM(S));
    }

    return { tokens, S0, frames, sAfter };
}

/* colour for a signed value: brand-green positive, warm-red negative */
function cellStyle(value, maxAbs) {
    const pct = Math.min(100, Math.round((Math.abs(value) / (maxAbs || 1)) * 100));
    const accent = value >= 0 ? 'var(--brand-100)' : '#c0503c';
    return { background: `color-mix(in srgb, ${accent} ${pct}%, transparent)` };
}
const barStyle = (value, maxAbs) => cellStyle(value, maxAbs);
const fmt = (x) => (Math.abs(x) < 0.05 ? '0' : x.toFixed(1));

/* small labelled vector of coloured cells */
function VecRow({ name, vec, maxAbs }) {
    return (
        <div className="kda-vec-row">
            <span className="kda-vec-name"><Eq tex={name} /></span>
            <span className="kda-vec">
                {vec.map((x, i) => (
                    <span key={i} className="kda-vec-cell" style={barStyle(x, maxAbs)}>{fmt(x)}</span>
                ))}
            </span>
        </div>
    );
}

function Matrix({ M, maxAbs, rows = DK, cols = DV, masked = null, diag = false }) {
    return (
        <div className="kda-matrix" style={{ gridTemplateColumns: `repeat(${cols}, 34px)` }}>
            {M.map((row, i) =>
                row.map((x, j) => {
                    const isMasked = masked ? masked(i, j) : false;
                    const isDiag = diag && i === j;
                    return (
                        <span
                            key={`${i}-${j}`}
                            className={`kda-cell${isMasked ? ' is-masked' : ''}${isDiag ? ' is-diag' : ''}`}
                            style={isMasked ? undefined : cellStyle(x, maxAbs)}
                        >
                            {isMasked ? '' : fmt(x)}
                        </span>
                    );
                })
            )}
        </div>
    );
}

const PHASES = {
    decay: {
        label: 'Channel-wise decay',
        tex: String.raw`\mathrm{Diag}(\boldsymbol{\alpha}_t)\,S_{t-1}`,
        text: 'Each key channel (matrix row) is scaled by its own retention factor αₜ ∈ (0,1) — the finer-grained gate that sets KDA apart from Gated DeltaNet\u2019s single scalar.',
    },
    erase: {
        label: 'Delta-rule erase',
        tex: String.raw`(\mathbf{I}-\beta_t\,\mathbf{k}_t\mathbf{k}_t^{\top})\,[\,\cdot\,]`,
        text: 'The delta rule removes the value currently associated with key kₜ, in proportion to the write strength βₜ, before a fresh association is stored.',
    },
    write: {
        label: 'Write new association',
        tex: String.raw`+\ \beta_t\,\mathbf{k}_t\mathbf{v}_t^{\top}`,
        text: 'The new key\u2013value outer product is added to the state with strength βₜ.',
    },
    read: {
        label: 'Read output',
        tex: String.raw`\tilde{\mathbf{o}}_t = S_t^{\top}\mathbf{q}_t`,
        text: 'The query reads the updated state to produce this token\u2019s output.',
    },
};
const PHASE_ORDER = ['decay', 'erase', 'write', 'read'];

/* =========================================================================
   FIGURE 1 — per-step recurrence (eq. 1 & 2)
   ========================================================================= */
export function KDARecurrenceViz() {
    const model = useMemo(buildModel, []);
    const [step, setStep] = useState(0); // index into frames
    const frame = model.frames[step];
    const tok = model.tokens[frame.t];
    const phase = PHASES[frame.phase];

    const maxAbsM = useMemo(() => {
        let m = 0;
        model.frames.forEach((f) => f.S.forEach((r) => r.forEach((x) => { m = Math.max(m, Math.abs(x)); })));
        return m;
    }, [model]);
    const maxAbsV = 1;

    const jumpToken = (t) => setStep(t * 4);

    return (
        <div className="kda-fig">
            <p className="kda-fig-title">Figure 1 · The recurrence, one token at a time</p>
            <p className="kda-fig-sub">
                State <Eq tex="S_t \in \mathbb{R}^{4\times 3}" /> updated by eq. (1). Step through the four
                stages — decay, erase, write, read — for each token.
            </p>

            <div className="kda-timeline">
                {model.tokens.map((_, t) => (
                    <button
                        key={t}
                        className={`kda-token-chip${t === frame.t ? ' is-active' : ''}`}
                        onClick={() => jumpToken(t)}
                    >token {t + 1}</button>
                ))}
            </div>

            <div className="kda-controls">
                <button className="kda-btn" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>‹ Prev</button>
                <button className="kda-btn" onClick={() => setStep((s) => Math.min(model.frames.length - 1, s + 1))} disabled={step === model.frames.length - 1}>Next ›</button>
                <button className="kda-btn" onClick={() => setStep(0)}>Reset</button>
                {PHASE_ORDER.map((p) => (
                    <button
                        key={p}
                        className={`kda-btn${frame.phase === p ? ' is-active' : ''}`}
                        onClick={() => setStep(frame.t * 4 + PHASE_ORDER.indexOf(p))}
                    >{PHASES[p].label.split(' ')[0]}</button>
                ))}
                <span className="kda-step-label">token {frame.t + 1} / {N} · stage {PHASE_ORDER.indexOf(frame.phase) + 1} / 4</span>
            </div>

            <div className="kda-stage">
                <div>
                    <div className="kda-panel-label">Token {frame.t + 1} projections · eq. (2)</div>
                    <VecRow name={String.raw`\mathbf{q}`} vec={tok.q} maxAbs={maxAbsV} />
                    <VecRow name={String.raw`\mathbf{k}`} vec={tok.k} maxAbs={maxAbsV} />
                    <VecRow name={String.raw`\mathbf{v}`} vec={tok.v} maxAbs={maxAbsV} />
                    <VecRow name={String.raw`\boldsymbol{\alpha}`} vec={tok.alpha} maxAbs={1} />
                    <div className="kda-vec-row">
                        <span className="kda-vec-name"><Eq tex={String.raw`\beta`} /></span>
                        <span className="kda-scalar-pill">{tok.beta.toFixed(2)}</span>
                    </div>
                </div>

                <div>
                    <div className="kda-panel-label">State matrix Sₜ &nbsp;(rows = key ch., cols = value ch.)</div>
                    <div className="kda-matrix-wrap">
                        <Matrix M={frame.S} maxAbs={maxAbsM} />
                        <span className="kda-axis">4 key channels × 3 value channels</span>
                    </div>
                </div>

                <div>
                    <div className="kda-panel-label">Output õₜ</div>
                    {frame.out
                        ? <VecRow name={String.raw`\tilde{\mathbf{o}}`} vec={frame.out} maxAbs={maxAbsM} />
                        : <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>computed after the write stage →</p>}
                </div>
            </div>

            <div className="kda-caption">
                <strong>{phase.label}</strong> — <Eq tex={phase.tex} /><br />
                {phase.text}
            </div>

            <div className="kda-legend">
                <span className="kda-legend-item"><span className="kda-swatch" style={{ background: 'color-mix(in srgb, var(--brand-100) 70%, transparent)' }} /> positive</span>
                <span className="kda-legend-item"><span className="kda-swatch" style={{ background: 'color-mix(in srgb, #c0503c 70%, transparent)' }} /> negative</span>
                <span className="kda-legend-item">intensity ∝ magnitude</span>
            </div>
        </div>
    );
}

/* =========================================================================
   FIGURE 2 — chunkwise parallel form (eq. 3 & 4)
   ========================================================================= */
function buildChunk(model, chunkIdx) {
    const start = chunkIdx * C;
    const toks = model.tokens.slice(start, start + C);
    const Sentry = chunkIdx === 0 ? model.S0 : model.sAfter[start - 1];

    // inclusive cumulative decay within the chunk: Gamma[r][ch] = prod_{u<=r} alpha_u
    const Gamma = [];
    for (let r = 0; r < C; r++) {
        const row = Array(DK).fill(1);
        for (let ch = 0; ch < DK; ch++) {
            let p = 1;
            for (let u = 0; u <= r; u++) p *= toks[u].alpha[ch];
            row[ch] = p;
        }
        Gamma.push(row);
    }

    // A = Tril[(Q ⊙ Γ)(K / Γ)^T]  -> C x C
    const A = zeros(C, C);
    for (let i = 0; i < C; i++) {
        for (let j = 0; j < C; j++) {
            if (i < j) { A[i][j] = 0; continue; } // strictly upper -> masked to 0
            let s = 0;
            for (let ch = 0; ch < DK; ch++) {
                s += toks[i].q[ch] * Gamma[i][ch] * (toks[j].k[ch] / Gamma[j][ch]);
            }
            A[i][j] = s;
        }
    }

    // inter-chunk term: (Γ ⊙ Q) S_entry   -> C x DV
    const inter = zeros(C, DV);
    for (let i = 0; i < C; i++)
        for (let cv = 0; cv < DV; cv++)
            for (let ch = 0; ch < DK; ch++)
                inter[i][cv] += Gamma[i][ch] * toks[i].q[ch] * Sentry[ch][cv];

    // intra-chunk term: A Ṽ  (illustrative: Ṽ ≈ V; the paper adds the UT-transform correction)
    const intra = zeros(C, DV);
    for (let i = 0; i < C; i++)
        for (let cv = 0; cv < DV; cv++)
            for (let j = 0; j <= i; j++)
                intra[i][cv] += A[i][j] * toks[j].v[cv];

    const total = inter.map((row, i) => row.map((x, cv) => x + intra[i][cv]));
    return { A, inter, intra, total, start };
}

export function KDAChunkwiseViz() {
    const model = useMemo(buildModel, []);
    const [chunkIdx, setChunkIdx] = useState(0);
    const [term, setTerm] = useState('total'); // inter | intra | total
    const nChunks = Math.floor(N / C);
    const data = useMemo(() => buildChunk(model, chunkIdx), [model, chunkIdx]);

    const shown = data[term];
    const maxAbsA = useMemo(() => Math.max(...data.A.flat().map(Math.abs), 0.01), [data]);
    const maxAbsO = useMemo(
        () => Math.max(...['inter', 'intra', 'total'].flatMap((t) => data[t].flat().map(Math.abs)), 0.01),
        [data]
    );

    return (
        <div className="kda-fig">
            <p className="kda-fig-title">Figure 2 · The chunkwise parallel form</p>
            <p className="kda-fig-sub">
                Within a chunk of size <Eq tex="C=3" />, all outputs are computed in parallel by eq. (4):
                an <em>inter-chunk</em> read of the entering state plus an <em>intra-chunk</em> causal mix.
            </p>

            <div className="kda-controls">
                {Array.from({ length: nChunks }, (_, c) => (
                    <button key={c} className={`kda-btn${c === chunkIdx ? ' is-active' : ''}`} onClick={() => setChunkIdx(c)}>
                        chunk {c + 1} (tokens {c * C + 1}–{c * C + C})
                    </button>
                ))}
            </div>

            <div className="kda-stage" style={{ gridTemplateColumns: 'minmax(160px, 1fr) minmax(200px, 1fr)' }}>
                <div>
                    <div className="kda-panel-label">
                        Intra-chunk matrix A = Tril[(Q ⊙ Γ)(K / Γ)ᵀ]
                    </div>
                    <div className="kda-matrix-wrap">
                        <Matrix M={data.A} maxAbs={maxAbsA} rows={C} cols={C} masked={(i, j) => i < j} diag />
                        <span className="kda-axis">rows = query pos · cols = key pos · lower-triangular (causal)</span>
                    </div>
                    <div className="kda-caption" style={{ marginTop: '0.8rem' }}>
                        The hatched cells are zeroed by <Eq tex={String.raw`\mathrm{Tril}`} />; the outlined
                        diagonal is kept so each token sees the state <em>after</em> its own update. The decay ratio
                        <Eq tex={String.raw`\ \boldsymbol{\gamma}^{\,i}/\boldsymbol{\gamma}^{\,j}`} /> weights how much
                        key <Eq tex="j" /> still influences query <Eq tex="i" />.
                    </div>
                </div>

                <div>
                    <div className="kda-panel-label">Output block Oₜ = inter + intra &nbsp;(C × 3)</div>
                    <div className="kda-controls" style={{ margin: '0 0 0.7rem' }}>
                        <button className={`kda-btn${term === 'inter' ? ' is-active' : ''}`} onClick={() => setTerm('inter')}>Inter-chunk</button>
                        <button className={`kda-btn${term === 'intra' ? ' is-active' : ''}`} onClick={() => setTerm('intra')}>Intra-chunk</button>
                        <button className={`kda-btn${term === 'total' ? ' is-active' : ''}`} onClick={() => setTerm('total')}>Total</button>
                    </div>
                    <div className="kda-matrix-wrap">
                        <Matrix M={shown} maxAbs={maxAbsO} rows={C} cols={DV} />
                        <span className="kda-axis">
                            {term === 'inter' && <><Eq tex={String.raw`(\Gamma \odot Q)\,S_{[t]}`} /> — carried from earlier chunks</>}
                            {term === 'intra' && <><Eq tex={String.raw`A\,\tilde{V}`} /> — interactions inside this chunk</>}
                            {term === 'total' && <>full output for the chunk</>}
                        </span>
                    </div>
                </div>
            </div>

            <div className="kda-legend">
                <span className="kda-legend-item"><span className="kda-swatch" style={{ background: 'color-mix(in srgb, var(--brand-100) 70%, transparent)' }} /> positive</span>
                <span className="kda-legend-item"><span className="kda-swatch" style={{ background: 'color-mix(in srgb, #c0503c 70%, transparent)' }} /> negative</span>
                <span className="kda-legend-item"><span className="kda-swatch" style={{ background: 'transparent' }} /> hatched = masked to 0</span>
            </div>
        </div>
    );
}
