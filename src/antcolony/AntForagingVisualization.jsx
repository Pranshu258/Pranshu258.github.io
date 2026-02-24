import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AntForagingSimulation, GRID_RES } from './AntForagingSimulation';
import '../styles/antcolony.css';

// ── Canvas width / height (logical pixels) ─────────────────────────────────
const W = 800;
const H = 520;

// ── Pheromone colour (amber) as RGB ────────────────────────────────────────
const PHERO_R = 245, PHERO_G = 158, PHERO_B = 11;

// ── Pheromone ImageData renderer ───────────────────────────────────────────
// Writes directly into a gw×gh ImageData, then drawn stretched to the canvas.
function buildPheromoneImageData(pheromones, gw, gh) {
    const data   = new Uint8ClampedArray(gw * gh * 4);
    const maxVal = 12; // clamp: values above this are treated as fully opaque
    for (let i = 0; i < gw * gh; i++) {
        const alpha = Math.min(1, pheromones[i] / maxVal);
        if (alpha < 0.008) {
            data[i * 4 + 3] = 0;
            continue;
        }
        data[i * 4    ] = PHERO_R;
        data[i * 4 + 1] = PHERO_G;
        data[i * 4 + 2] = PHERO_B;
        data[i * 4 + 3] = Math.round(alpha * 210); // max alpha: 210/255 (~82%)
    }
    return new ImageData(data, gw, gh);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draw a single ant at (x, y) oriented along `angle` (radians, 0 = right).
 * The ant is drawn in local space (head points up), then rotated so the head
 * faces the direction of travel.
 */
function drawAnt(ctx, x, y, angle, isReturning, frustration = 0) {
    let body, border, legs;
    if (isReturning) {
        body   = '#1c1c1c';
        border = '#ef4444';
        legs   = '#ef4444';
    } else if (frustration > 0) {
        // black (#111) → gray (#71717a) as frustration 0→1
        const r = Math.round(17 + (113 - 17) * frustration);
        const g = Math.round(17 + (113 - 17) * frustration);
        const b = Math.round(17 + (122 - 17) * frustration);
        body   = `rgb(${r},${g},${b})`;
        border = body;
        legs   = body;
    } else {
        body   = '#111111';
        border = '#3f3f46';
        legs   = '#52525b';
    }

    ctx.save();
    ctx.translate(x, y);
    // ant is drawn head-up (head at −y); rotate so head points toward ant.angle
    ctx.rotate(angle + Math.PI / 2);

    // ── Abdomen ───────────────────────────────────────────────────────
    ctx.globalAlpha = 0.92;
    ctx.fillStyle   = body;
    ctx.strokeStyle = border;
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 5.5, 2.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── Thorax ─────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(0, 1.2, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── Head ───────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.arc(0, -2.3, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ── Legs (3 pairs, attached to thorax) ────────────────────────────
    ctx.strokeStyle = legs;
    ctx.lineWidth   = 0.65;

    // front pair — angle forward
    ctx.globalAlpha = 0.75;
    ctx.beginPath(); ctx.moveTo(-0.5, 0.2); ctx.lineTo(-5.5, -2);   ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 0.5, 0.2); ctx.lineTo( 5.5, -2);   ctx.stroke();

    // middle pair — horizontal
    ctx.beginPath(); ctx.moveTo(-0.5, 1.2); ctx.lineTo(-6,    0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 0.5, 1.2); ctx.lineTo( 6,    0.5); ctx.stroke();

    // back pair — angle backward
    ctx.beginPath(); ctx.moveTo(-0.5, 2.2); ctx.lineTo(-5.5,  4.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 0.5, 2.2); ctx.lineTo( 5.5,  4.5); ctx.stroke();

    // ── Antennae ───────────────────────────────────────────────────────
    ctx.strokeStyle = border;
    ctx.lineWidth   = 0.6;
    ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(-0.7, -3.6); ctx.lineTo(-3.8, -7.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo( 0.7, -3.6); ctx.lineTo( 3.8, -7.5); ctx.stroke();

    ctx.restore();
}

function drawCircle(ctx, x, y, angle, isReturning, frustration = 0) {
    let fill, stroke;
    if (isReturning) {
        fill   = '#ef4444';
        stroke = '#b91c1c';
    } else if (frustration > 0) {
        // dark gray (#27272a) → gray (#71717a) as frustration 0→1
        const r = Math.round(39 + (113 - 39) * frustration);
        const g = Math.round(39 + (113 - 39) * frustration);
        const b = Math.round(42 + (122 - 42) * frustration);
        fill   = `rgb(${r},${g},${b})`;
        stroke = fill;
    } else {
        fill   = '#27272a';
        stroke = '#52525b';
    }
    const w = isReturning ? 7 : 6;   // length along travel direction
    const h = isReturning ? 3.5 : 3; // width
    const r = h / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle   = fill;
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = 0.88;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
}

export default function AntForagingVisualization() {
    const canvasRef      = useRef(null);
    const offscreenRef   = useRef(null);   // off-screen canvas for ImageData blitting
    const simRef         = useRef(null);   // AntForagingSimulation instance
    const rafRef         = useRef(null);   // requestAnimationFrame id
    const isRunningRef   = useRef(false);
    const isPausedRef    = useRef(false);
    const speedRef       = useRef(3);

    // React state for UI
    const [isRunning, setIsRunning]   = useState(false);
    const [isPaused,  setIsPaused]    = useState(false);
    const [panelOpen, setPanelOpen]   = useState(true);

    // Live stats (updated via ref tricks to avoid batching lag)
    const foodLabelRef    = useRef(null);
    const tickLabelRef    = useRef(null);
    const searchingRef    = useRef(null);
    const returningRef    = useRef(null);
    const progressPipRef  = useRef(null);

    // Parameters
    const [numAnts,           setNumAnts]           = useState(150);  // real colony at 1:100 scale
    const [maxFoodSources,    setMaxFoodSources]    = useState(6);    // simultaneous food patches
    const [foodSpawnInterval, setFoodSpawnInterval] = useState(700);  // ticks between new spawns
    const [evapRate,     setEvapRate]     = useState(0.004); // real half-life 10–30 min, compressed
    const [diffuseRate,  setDiffuseRate]  = useState(0.08);
    const [sensorDist,   setSensorDist]   = useState(8);     // real 2–5 mm ≈ 1 body length
    const [speed,        setSpeed]        = useState(3);

    // Toggles
    const [showPheromone, setShowPheromone] = useState(true);
    const showPheromoneRef = useRef(true);

    const [antShape, setAntShape] = useState('circle'); // 'ant' | 'circle'
    const antShapeRef = useRef('circle');

    // ── Helpers ──────────────────────────────────────────────────────────────

    // Set up DPR-aware canvas + off-screen canvas for the ImageData stretch
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width          = W * dpr;
        canvas.height         = H * dpr;
        canvas.style.width    = W + 'px';
        canvas.style.height   = H + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Off-screen canvas for pheromone ImageData blitting (grid resolution)
        const off     = document.createElement('canvas');
        off.width     = Math.ceil(W / GRID_RES);
        off.height    = Math.ceil(H / GRID_RES);
        offscreenRef.current = off;
    }, []);

    // Build / rebuild the simulation
    const buildSim = useCallback((params = {}) => {
        const sim = new AntForagingSimulation(W, H, {
            numAnts:           params.numAnts           ?? numAnts,
            maxFoodSources:    params.maxFoodSources    ?? maxFoodSources,
            foodSpawnInterval: params.foodSpawnInterval ?? foodSpawnInterval,
            evapRate:          params.evapRate          ?? evapRate,
            diffuseRate:       params.diffuseRate       ?? diffuseRate,
            sensorDist:        params.sensorDist        ?? sensorDist,
        });
        simRef.current = sim;
        return sim;
    }, [numAnts, maxFoodSources, foodSpawnInterval, evapRate, diffuseRate, sensorDist]);

    // ── Rendering ─────────────────────────────────────────────────────────────

    const render = useCallback(() => {
        const canvas = canvasRef.current;
        const off    = offscreenRef.current;
        const sim    = simRef.current;
        if (!canvas || !off || !sim) return;

        const ctx               = canvas.getContext('2d');
        const { ants, nest, foodSources, pheromones, gw, gh } = sim.getState();

        // ── Background ──────────────────────────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ── Subtle grid ──────────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth   = 1;
        for (let x = 0; x < W; x += 50) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 50) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // ── Pheromone layer (via off-screen → stretched blit) ────────────────
        if (showPheromoneRef.current) {
            const offCtx  = off.getContext('2d');
            const imgData = buildPheromoneImageData(pheromones, gw, gh);
            offCtx.putImageData(imgData, 0, 0);
            ctx.drawImage(off, 0, 0, W, H); // stretch to full canvas
        }

        // ── Food sources ─────────────────────────────────────────────────────
        for (const food of foodSources) {
            if (food.amount <= 0) continue;
            const ratio  = food.amount / food.maxAmount;
            const radius = food.radius * (0.5 + 0.5 * ratio);

            // Outer glow
            const grd = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, radius + 6);
            grd.addColorStop(0,   'rgba(34,197,94,0.25)');
            grd.addColorStop(1,   'rgba(34,197,94,0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(food.x, food.y, radius + 6, 0, Math.PI * 2);
            ctx.fill();

            // Food circle fill (fades as food depletes)
            ctx.fillStyle   = `rgba(34,197,94,${0.3 + 0.7 * ratio})`;
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.arc(food.x, food.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Food count label (shown when there's meaningful food left)
            if (food.amount > 3) {
                ctx.fillStyle  = '#14532d';
                ctx.font       = 'bold 11px -apple-system, sans-serif';
                ctx.textAlign  = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(food.amount, food.x, food.y);
            }
        }

        // ── Nest ─────────────────────────────────────────────────────────────
        const { x: nx, y: ny, radius: nr } = nest;

        // Glow ring
        const nestGrd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr + 10);
        nestGrd.addColorStop(0,   'rgba(146, 64, 14, 0.25)');
        nestGrd.addColorStop(1,   'rgba(146, 64, 14, 0)');
        ctx.fillStyle = nestGrd;
        ctx.beginPath();
        ctx.arc(nx, ny, nr + 10, 0, Math.PI * 2);
        ctx.fill();

        // Nest fill
        ctx.fillStyle   = '#92400e';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth   = 2.5;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nest label
        ctx.fillStyle    = '#fef3c7';
        ctx.font         = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nest', nx, ny);

        // ── Ants ─────────────────────────────────────────────────────────────
        let searching = 0, returning = 0;
        for (const ant of ants) {
            const isReturning = ant.state === 'RETURNING';
            if (isReturning) returning++; else searching++;
            // Frustrated = searching too long OR gave up (returning without food)
            const frustration = !ant.hasFood
                ? Math.max(0, Math.min(1, (ant.stepsSinceFood - 1200) / 1200))
                : 0;
            if (antShapeRef.current === 'ant') {
                drawAnt(ctx, ant.x, ant.y, ant.angle, isReturning && ant.hasFood, frustration);
            } else {
                drawCircle(ctx, ant.x, ant.y, ant.angle, isReturning && ant.hasFood, frustration);
            }
        }
        ctx.globalAlpha = 1;

        // ── Update live DOM stats ─────────────────────────────────────────────
        const { foodCollected, tick } = sim.getState();
        // Show how depleted the current visible food sources are (fills as ants harvest them).
        const totalOnScreen  = foodSources.reduce((s, f) => s + f.maxAmount, 0);
        const remainOnScreen = foodSources.reduce((s, f) => s + f.amount,    0);
        const depletedPct = totalOnScreen > 0 ? Math.round((1 - remainOnScreen / totalOnScreen) * 100) : 0;
        if (foodLabelRef.current)   foodLabelRef.current.textContent   = foodCollected;
        if (tickLabelRef.current)   tickLabelRef.current.textContent   = tick;
        if (searchingRef.current)   searchingRef.current.textContent   = searching;
        if (returningRef.current)   returningRef.current.textContent   = returning;
        if (progressPipRef.current) {
            progressPipRef.current.style.width = depletedPct + '%';
        }
    }, []);

    // ── Animation loop ─────────────────────────────────────────────────────────

    const animate = useCallback(() => {
        if (!isRunningRef.current) return;
        if (!isPausedRef.current) {
            const stepsPerFrame = Math.max(1, speedRef.current);
            simRef.current?.step(stepsPerFrame);
        }
        render();
        rafRef.current = requestAnimationFrame(animate);
    }, [render]);

    // ── Actions ─────────────────────────────────────────────────────────────

    const handleStart = () => {
        if (isRunningRef.current) return;
        buildSim();
        isRunningRef.current = true;
        isPausedRef.current  = false;
        setIsRunning(true);
        setIsPaused(false);
        rafRef.current = requestAnimationFrame(animate);
    };

    const handlePause = () => {
        if (!isRunningRef.current) return;
        const nowPaused = !isPausedRef.current;
        isPausedRef.current = nowPaused;
        setIsPaused(nowPaused);
    };

    const handleReset = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        isRunningRef.current = false;
        isPausedRef.current  = false;
        setIsRunning(false);
        setIsPaused(false);
        if (progressPipRef.current) progressPipRef.current.style.width = '0%';
        setTimeout(() => {
            buildSim();
            render();
        }, 20);
    };

    // Sync speed ref
    const handleSpeedChange = (v) => {
        setSpeed(v);
        speedRef.current = v;
    };

    // Sync show-pheromone ref
    const handleTogglePheromone = () => {
        setShowPheromone(v => {
            showPheromoneRef.current = !v;
            return !v;
        });
    };

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    useEffect(() => {
        setupCanvas();
        buildSim();
        setTimeout(() => render(), 30);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-render when show-pheromone toggle changes while paused/idle
    useEffect(() => {
        showPheromoneRef.current = showPheromone;
        if (!isRunningRef.current || isPausedRef.current) render();
    }, [showPheromone, render]);

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="antcolony-container">

            {/* ── Canvas ──────────────────────────────────────────────────── */}
            <div className="antcolony-canvas-wrap">
                <canvas ref={canvasRef} className="antcolony-canvas" />
            </div>

            {/* ── Stats + Legend row ──────────────────────────────────────── */}
            <div className="aco-meta-row">
                <div className="antcolony-stat-bar">
                    <span className="stat-pill stat-pill-progress">
                        <span className="progress-pip" ref={progressPipRef} style={{ width: '0%' }} />
                        <span className="progress-pip-text">
                            Food <strong ref={foodLabelRef}>0</strong>
                        </span>
                    </span>
                    <span className="stat-pill">
                        Tick <strong ref={tickLabelRef}>0</strong>
                    </span>
                    <span className="stat-pill">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#27272a', marginRight: 4 }} />
                        Searching <strong ref={searchingRef}>0</strong>
                    </span>
                    <span className="stat-pill">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 4 }} />
                        Returning <strong ref={returningRef}>0</strong>
                    </span>
                </div>

                <div className="aco-legend">
                    <span
                        className={`aco-legend-item aco-legend-toggle${showPheromone ? '' : ' aco-legend-off'}`}
                        onClick={handleTogglePheromone}
                        title="Toggle pheromone overlay"
                    >
                        <span className="aco-legend-swatch" style={{ background: '#fde68a', border: '1.5px solid #f59e0b' }} />
                        Pheromone
                    </span>
                    <span className="aco-legend-item">
                        <span className="aco-legend-swatch" style={{ background: '#27272a' }} />
                        Searching
                    </span>
                    <span className="aco-legend-item">
                        <span className="aco-legend-swatch" style={{ background: '#ef4444' }} />
                        With food
                    </span>
                    <span className="aco-legend-item">
                        <span className="aco-legend-swatch" style={{ background: '#22c55e', borderRadius: '50%', width: 10, height: 10, display: 'inline-block' }} />
                        Food source
                    </span>
                    <span className="aco-legend-item">
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#92400e', marginRight: 6 }} />
                        Nest
                    </span>
                </div>
            </div>

            {/* ── Action buttons ──────────────────────────────────────────── */}
            <div className="antcolony-actions">
                <button onClick={handleStart} disabled={isRunning} className="aco-btn aco-btn-start">
                    ▶ Start
                </button>
                <button onClick={handlePause} disabled={!isRunning} className="aco-btn aco-btn-pause">
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>
                <button onClick={handleReset} className="aco-btn aco-btn-reset">
                    ↺ Reset
                </button>
                <button
                    onClick={() => setAntShape(v => {
                        const next = v === 'ant' ? 'circle' : 'ant';
                        antShapeRef.current = next;
                        if (!isRunningRef.current || isPausedRef.current) render();
                        return next;
                    })}
                    className="aco-btn"
                    title={antShape === 'ant' ? 'Switch to dots (bug-free mode)' : 'Switch to ant shapes'}
                >
                    {antShape === 'ant' ? '● Dots' : '🐜 Ants'}
                </button>
            </div>

            {/* ── Parameter panel ─────────────────────────────────────────── */}
            <div className="antcolony-info-panel">
                <button className="aco-panel-header" onClick={() => setPanelOpen(v => !v)}>
                    <span>Parameters</span>
                    <svg className={`aco-panel-chevron${panelOpen ? ' open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className={`aco-panel-body${panelOpen ? ' open' : ''}`}>
                    <div className="aco-panel-inner">
                        <div className="aco-params-grid">

                            <div className="control-group">
                                <label>Ants <span className="value">{numAnts}</span></label>
                                <input type="range" min="20" max="300" value={numAnts}
                                    onChange={e => setNumAnts(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Max food patches <span className="value">{maxFoodSources}</span></label>
                                <input type="range" min="1" max="12" value={maxFoodSources}
                                    onChange={e => setMaxFoodSources(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Spawn interval <span className="value">{foodSpawnInterval} ticks</span></label>
                                <input type="range" min="200" max="2000" step="50" value={foodSpawnInterval}
                                    onChange={e => setFoodSpawnInterval(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Evaporation <span className="value">{evapRate.toFixed(3)}</span></label>
                                <input type="range" min="0.001" max="0.06" step="0.001" value={evapRate}
                                    onChange={e => setEvapRate(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Diffusion <span className="value">{diffuseRate.toFixed(2)}</span></label>
                                <input type="range" min="0" max="0.4" step="0.01" value={diffuseRate}
                                    onChange={e => setDiffuseRate(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Sensor distance <span className="value">{sensorDist}px</span></label>
                                <input type="range" min="6" max="40" value={sensorDist}
                                    onChange={e => setSensorDist(+e.target.value)}
                                    disabled={isRunning} className="slider" />
                            </div>

                            <div className="control-group">
                                <label>Sim speed <span className="value">{speed}×</span></label>
                                <input type="range" min="1" max="12" value={speed}
                                    onChange={e => handleSpeedChange(+e.target.value)}
                                    className="slider" />
                            </div>

                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
