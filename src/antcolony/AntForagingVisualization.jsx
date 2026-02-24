import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AntForagingSimulation, GRID_RES } from './AntForagingSimulation';
import '../styles/antcolony.css';

// ── Canvas width / height (logical pixels) ─────────────────────────────────
const W = 800;
const H = 520;

// ── Pheromone colour (amber) as RGB ────────────────────────────────────────
 const PHERO_R = 245, PHERO_G = 158, PHERO_B = 11;

// ── Terrain ImageData renderer ─────────────────────────────────────────
// Cells below waterLevel are coloured as water (depth-shaded blue);
// cells above use a green → tan → brown elevation ramp.
function buildTerrainImageData(heightmap, gw, gh, waterLevel) {
    const data = new Uint8ClampedArray(gw * gh * 4);
    for (let i = 0; i < gw * gh; i++) {
        const t = heightmap[i];
        let r, g, b, a;
        if (t < waterLevel) {
            // Water: deeper = darker and more opaque
            const depth = 1 - t / waterLevel; // 0 = shore, 1 = deepest
            r = Math.round(30  + (70  - 30)  * (1 - depth));
            g = Math.round(100 + (170 - 100) * (1 - depth));
            b = Math.round(200 + (240 - 200) * (1 - depth));
            a = Math.round(160 + depth * 80); // 160 → 240
        } else {
            // Land: normalise position above waterLevel to 0–1
            const tn = (t - waterLevel) / (1 - waterLevel);
            if (tn < 0.5) {
                const s = tn * 2;
                r = Math.round(134 + (210 - 134) * s);
                g = Math.round(239 + (200 - 239) * s);
                b = Math.round(172 + (150 - 172) * s);
                a = Math.round(30  + (55  - 30)  * s);
            } else {
                const s = (tn - 0.5) * 2;
                r = Math.round(210 + (170 - 210) * s);
                g = Math.round(200 + (120 - 200) * s);
                b = Math.round(150 + ( 80 - 150) * s);
                a = Math.round(55  + (80  - 55)  * s);
            }
        }
        data[i * 4    ] = r;
        data[i * 4 + 1] = g;
        data[i * 4 + 2] = b;
        data[i * 4 + 3] = a;
    }
    return new ImageData(data, gw, gh);
}

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
 * Trace a smooth organic blob path into `ctx`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x          centre x
 * @param {number} y          centre y
 * @param {number} baseRadius base radius in px
 * @param {number[]} shapeRadii  per-point radius multipliers (length = N)
 * @param {number} [extra=0]  uniform extra px added to every radius (for glows)
 */
function drawBlobPath(ctx, x, y, baseRadius, shapeRadii, extra = 0) {
    const n    = shapeRadii.length;
    const step = (Math.PI * 2) / n;
    const pts  = shapeRadii.map((r, i) => ({
        x: x + Math.cos(i * step) * (baseRadius * r + extra),
        y: y + Math.sin(i * step) * (baseRadius * r + extra),
    }));
    // Smooth closed curve: move to midpoint between last and first,
    // then quadratic-bezier through each vertex to the next midpoint.
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const curr = pts[i];
        const next = pts[(i + 1) % n];
        const mx   = (curr.x + next.x) / 2;
        const my   = (curr.y + next.y) / 2;
        if (i === 0) {
            const prev = pts[n - 1];
            ctx.moveTo((prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
        }
        ctx.quadraticCurveTo(curr.x, curr.y, mx, my);
    }
    ctx.closePath();
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
    const terrainOffRef  = useRef(null);   // off-screen canvas for terrain layer
    const terrainStaleRef = useRef(true);  // true → rebuild terrain on next render
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
    const diedLabelRef    = useRef(null);
    const populationRef   = useRef(null);
    const queenBarRef     = useRef(null);  // inner fill of queen health bar
    const queenStatusRef  = useRef(null);  // text label for queen state
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

        // Off-screen canvas for terrain layer (same grid resolution)
        const terrOff     = document.createElement('canvas');
        terrOff.width     = Math.ceil(W / GRID_RES);
        terrOff.height    = Math.ceil(H / GRID_RES);
        terrainOffRef.current = terrOff;
    }, []);

    // Build / rebuild the simulation
    const buildSim = useCallback((params = {}) => {
        terrainStaleRef.current = true; // new sim → new heightmap → redraw terrain
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
        const canvas  = canvasRef.current;
        const off     = offscreenRef.current;
        const terrOff = terrainOffRef.current;
        const sim     = simRef.current;
        if (!canvas || !off || !sim) return;

        const ctx = canvas.getContext('2d');
        const { ants, nest, foodSources, waterLevel, heightmap, pheromones, gw, gh, queenDead } = sim.getState();

        // ── Background ──────────────────────────────────────────────────────
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ── Terrain layer ─────────────────────────────────────────────
        if (terrOff && heightmap) {
            if (terrainStaleRef.current) {
                const terrCtx = terrOff.getContext('2d');
                terrCtx.putImageData(buildTerrainImageData(heightmap, gw, gh, waterLevel ?? 0.22), 0, 0);
                terrainStaleRef.current = false;
            }
            ctx.drawImage(terrOff, 0, 0, W, H);

            // Shore line at the water boundary
            const wl = waterLevel ?? 0.22;
            ctx.save();
            ctx.strokeStyle = 'rgba(14,165,233,0.55)';
            ctx.lineWidth   = 1.0;
            ctx.beginPath();
            for (let gy = 0; gy < gh - 1; gy++) {
                for (let gx = 0; gx < gw - 1; gx++) {
                    const h00 = heightmap[ gy      * gw + gx    ];
                    const h10 = heightmap[ gy      * gw + gx + 1];
                    const h01 = heightmap[(gy + 1) * gw + gx    ];
                    const cross = (h00 < wl) !== (h10 < wl)
                               || (h00 < wl) !== (h01 < wl);
                    if (!cross) continue;
                    const px = gx * GRID_RES, py = gy * GRID_RES;
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + GRID_RES, py + GRID_RES);
                }
            }
            ctx.stroke();

            // Elevation contour lines on dry land only
            const CONTOUR_LEVELS = [0.35, 0.55, 0.72, 0.88];
            ctx.lineWidth = 0.6;
            for (const level of CONTOUR_LEVELS) {
                ctx.strokeStyle = level > 0.65
                    ? 'rgba(120,80,40,0.18)'
                    : 'rgba(60,120,60,0.14)';
                ctx.beginPath();
                for (let gy = 0; gy < gh - 1; gy++) {
                    for (let gx = 0; gx < gw - 1; gx++) {
                        const h00 = heightmap[ gy      * gw + gx    ];
                        const h10 = heightmap[ gy      * gw + gx + 1];
                        const h01 = heightmap[(gy + 1) * gw + gx    ];
                        // Skip cells that are fully underwater
                        if (h00 < wl && h10 < wl && h01 < wl) continue;
                        const cross = (h00 < level) !== (h10 < level)
                                   || (h00 < level) !== (h01 < level);
                        if (!cross) continue;
                        const px = gx * GRID_RES, py = gy * GRID_RES;
                        ctx.moveTo(px, py);
                        ctx.lineTo(px + GRID_RES, py + GRID_RES);
                    }
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // ── Subtle grid ────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(0,0,0,0.03)';
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
            drawBlobPath(ctx, food.x, food.y, radius, food.shapeRadii, 6);
            ctx.fill();

            // Food blob fill (fades as food depletes)
            ctx.fillStyle   = `rgba(34,197,94,${0.3 + 0.7 * ratio})`;
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth   = 2;
            drawBlobPath(ctx, food.x, food.y, radius, food.shapeRadii);
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
        const nestFill   = queenDead ? '#374151' : '#92400e';
        const nestStroke = queenDead ? '#1f2937' : '#78350f';
        const nestGlow   = queenDead ? 'rgba(55,65,81,0.30)' : 'rgba(146,64,14,0.25)';

        // Glow ring
        const nestGrd = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr + 10);
        nestGrd.addColorStop(0, nestGlow);
        nestGrd.addColorStop(1, queenDead ? 'rgba(55,65,81,0)' : 'rgba(146,64,14,0)');
        ctx.fillStyle = nestGrd;
        drawBlobPath(ctx, nx, ny, nr, nest.shapeRadii, 10);
        ctx.fill();

        // Nest fill
        ctx.fillStyle   = nestFill;
        ctx.strokeStyle = nestStroke;
        ctx.lineWidth   = 2.5;
        drawBlobPath(ctx, nx, ny, nr, nest.shapeRadii);
        ctx.fill();
        ctx.stroke();

        // Nest label
        ctx.fillStyle    = queenDead ? '#9ca3af' : '#fef3c7';
        ctx.font         = 'bold 11px -apple-system, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(queenDead ? '\u2620 Nest' : 'Nest', nx, ny);

        // ── Ants ─────────────────────────────────────────────────────────────
        let searching = 0, returning = 0;
        for (const ant of ants) {
            const isReturning = ant.state === 'RETURNING';
            if (isReturning) returning++; else searching++;
            // Frustrated = searching too long OR gave up (returning without food)
            const frustration = !ant.hasFood
                ? Math.max(0, Math.min(1, (ant.stepsSinceFood - 1200) / 1200))
                : 0;
            drawCircle(ctx, ant.x, ant.y, ant.angle, isReturning && ant.hasFood, frustration);
        }
        ctx.globalAlpha = 1;

        // ── Update live DOM stats ─────────────────────────────────────────────
        const { foodCollected, tick, antsDied, queenHungerTimer, queenStarvationThreshold } = sim.getState();
        // Show how depleted the current visible food sources are (fills as ants harvest them).
        const totalOnScreen  = foodSources.reduce((s, f) => s + f.maxAmount, 0);
        const remainOnScreen = foodSources.reduce((s, f) => s + f.amount,    0);
        const depletedPct = totalOnScreen > 0 ? Math.round((1 - remainOnScreen / totalOnScreen) * 100) : 0;
        if (foodLabelRef.current)   foodLabelRef.current.textContent   = foodCollected;
        if (tickLabelRef.current)   tickLabelRef.current.textContent   = tick;
        if (searchingRef.current)   searchingRef.current.textContent   = searching;
        if (returningRef.current)   returningRef.current.textContent   = returning;
        if (diedLabelRef.current)   diedLabelRef.current.textContent   = antsDied;
        if (populationRef.current)  populationRef.current.textContent  = ants.length;
        if (queenBarRef.current) {
            const health = queenDead ? 0 : Math.max(0, 1 - queenHungerTimer / queenStarvationThreshold);
            queenBarRef.current.style.width = Math.round(health * 100) + '%';
            queenBarRef.current.style.background = health > 0.5 ? 'rgba(168,85,247,0.2)' : health > 0.25 ? 'rgba(249,115,22,0.22)' : 'rgba(239,68,68,0.22)';
        }
        if (queenStatusRef.current) {
            queenStatusRef.current.textContent = queenDead ? '☠ Queen dead' : 'Queen';
            queenStatusRef.current.style.color = queenDead ? '#ef4444' : '';
        }
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
        if (!simRef.current) buildSim();
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
                    <span className="stat-pill">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#6b7280', marginRight: 4 }} />
                        Died <strong ref={diedLabelRef}>0</strong>
                    </span>
                    <span className="stat-pill">
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', marginRight: 4 }} />
                        Population <strong ref={populationRef}>0</strong>
                    </span>
                    <span className="stat-pill stat-pill-progress stat-pill-queen" style={{ minWidth: 120 }}>
                        <span className="progress-pip" ref={queenBarRef} style={{ width: '100%', background: 'rgba(168,85,247,0.2)' }} />
                        <span className="progress-pip-text" ref={queenStatusRef}>Queen</span>
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
