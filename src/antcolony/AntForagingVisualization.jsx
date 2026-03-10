import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AntForagingSimulation, GRID_RES } from './AntForagingSimulation';
import { ResponsiveLine } from '@nivo/line';
import '../styles/antcolony.css';

// ── Canvas width / height (logical pixels) ─────────────────────────────────
const W = 800;
const H = 520;

// ── Pheromone colour (amber) as RGB ────────────────────────────────────────
 const PHERO_R = 245, PHERO_G = 158, PHERO_B = 11;

// ── Terrain ImageData renderer ─────────────────────────────────────────
// Cells below waterLevel are coloured as water (depth-shaded blue);
// cells above use a green → tan → brown elevation ramp.
function buildTerrainImageData(heightmap, gw, gh, waterLevel, width, height) {
    // Render at full canvas resolution by bilinearly sampling the heightmap.
    // This keeps the water/land boundary pixel-precise — no bleed from upscaling.
    const data = new Uint8ClampedArray(width * height * 4);
    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            // Map canvas pixel to fractional heightmap coordinates
            // Use px/GRID_RES (not normalised) so this matches the marching-squares
            // contour which places grid cell gx at pixel gx*GRID_RES exactly.
            const fx = px / GRID_RES;
            const fy = py / GRID_RES;
            const x0 = Math.floor(fx), x1 = Math.min(x0 + 1, gw - 1);
            const y0 = Math.floor(fy), y1 = Math.min(y0 + 1, gh - 1);
            const tx = fx - x0, ty = fy - y0;
            // Bilinear interpolation of elevation
            const t = heightmap[y0 * gw + x0] * (1 - tx) * (1 - ty)
                    + heightmap[y0 * gw + x1] *      tx  * (1 - ty)
                    + heightmap[y1 * gw + x0] * (1 - tx) *      ty
                    + heightmap[y1 * gw + x1] *      tx  *      ty;

            let r, g, b, a;
            if (t < waterLevel) {
                const depth = 1 - t / waterLevel; // 0 = shore, 1 = deepest
                r = Math.round(186 + (59  - 186) * depth);
                g = Math.round(230 + (130 - 230) * depth);
                b = Math.round(253 + (246 - 253) * depth);
                a = 230;
            } else {
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

            const i = py * width + px;
            data[i * 4    ] = r;
            data[i * 4 + 1] = g;
            data[i * 4 + 2] = b;
            data[i * 4 + 3] = a;
        }
    }
    return new ImageData(data, width, height);
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

function drawCircle(ctx, x, y, angle, isReturning, frustration = 0, isScout = false, isDark = false) {
    let fill, stroke;
    if (isReturning) {
        fill   = '#ef4444';
        stroke = '#b91c1c';
    } else if (frustration > 0) {
        if (isDark) {
            // light gray → mid-gray as frustration 0→1 (visible on dark bg)
            const v = Math.round(180 - 60 * frustration);
            fill   = `rgb(${v},${v},${v})`;
            stroke = fill;
        } else {
            // dark gray (#27272a) → gray (#71717a) as frustration 0→1
            const r = Math.round(39 + (113 - 39) * frustration);
            const g = Math.round(39 + (113 - 39) * frustration);
            const b = Math.round(42 + (122 - 42) * frustration);
            fill   = `rgb(${r},${g},${b})`;
            stroke = fill;
        }
    } else {
        if (isDark) {
            fill   = '#d4d4d8';  // zinc-300 — clearly visible on #141414
            stroke = '#a1a1aa';  // zinc-400
        } else {
            fill   = '#27272a';
            stroke = '#52525b';
        }
    }
    // Scouts are slightly larger than workers (1.4×) but otherwise identical
    const sizeScale = isScout ? 1.4 : 1.0;
    const w = (isReturning ? 7 : 6)   * sizeScale;   // length along travel direction
    const h = (isReturning ? 3.5 : 3) * sizeScale;   // width
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

// ── Wall-clock duration formatter (ms → m:ss or h:mm:ss) ──────────────────
function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AntForagingVisualization() {
    const canvasRef      = useRef(null);
    const offscreenRef   = useRef(null);   // off-screen canvas for ImageData blitting
    const terrainOffRef  = useRef(null);   // off-screen canvas for terrain layer
    const terrainStaleRef = useRef(true);  // true → rebuild terrain on next render
    const simRef         = useRef(null);   // AntForagingSimulation instance
    const rafRef           = useRef(null);   // requestAnimationFrame id
    const isRunningRef     = useRef(false);
    const isPausedRef      = useRef(false);
    const speedRef         = useRef(3);
    const pressingRef      = useRef(null);   // { x, y, downTime } while pointer held, else null
    const previewRafRef    = useRef(null);   // rAF id for preview animation while idle/paused

    // React state for UI
    const [isRunning, setIsRunning]   = useState(false);
    const [isPaused,  setIsPaused]    = useState(false);

    // Live stats (updated via ref tricks to avoid batching lag)
    const tickLabelRef    = useRef(null);
    const searchingRef    = useRef(null);
    const returningRef    = useRef(null);
    const diedLabelRef    = useRef(null);
    const populationRef   = useRef(null);
    const queenBarRef     = useRef(null);  // inner fill of queen health bar
    const queenStatusRef  = useRef(null);  // text label for queen state

    // Elapsed wall-clock time tracking (pauses correctly)
    const lastResumeRef   = useRef(null);  // performance.now() at last resume
    const elapsedMsRef    = useRef(0);     // accumulated ms across pauses

    // Parameters
    const numAnts           = 150;
    const maxFoodSources    = 6;
    const foodSpawnInterval = 700;
    const evapRate          = 0.004;
    const diffuseRate       = 0.08;
    const sensorDist        = 8;


    // Toggles
    const [showPheromone, setShowPheromone] = useState(true);
    const showPheromoneRef = useRef(true);

    // Chart data
    const CHART_SERIES_INIT = [
        { id: 'Food', color: '#22c55e', data: [] },
        { id: 'Population', color: '#3b82f6', data: [] },
    ];
    const [chartData, setChartData] = useState(CHART_SERIES_INIT);
    const chartDataRef    = useRef(CHART_SERIES_INIT.map(s => ({ ...s, data: [] })));
    const lastChartTickRef = useRef(-1);



    // ── Helpers ──────────────────────────────────────────────────────────────

    // Set up DPR-aware canvas + off-screen canvas for the ImageData stretch
    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width          = W * dpr;
        canvas.height         = H * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // Off-screen canvas for pheromone ImageData blitting (grid resolution)
        const off     = document.createElement('canvas');
        off.width     = Math.ceil(W / GRID_RES);
        off.height    = Math.ceil(H / GRID_RES);
        offscreenRef.current = off;

        // Off-screen canvas for terrain layer — full canvas resolution so
        // the water boundary is pixel-precise with no upscale bleed.
        const terrOff     = document.createElement('canvas');
        terrOff.width     = W;
        terrOff.height    = H;
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
        const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
        ctx.fillStyle = isDark ? '#141414' : '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ── Terrain layer ─────────────────────────────────────────────
        if (terrOff && heightmap) {
            if (terrainStaleRef.current) {
                const terrCtx = terrOff.getContext('2d');
                terrCtx.putImageData(buildTerrainImageData(heightmap, gw, gh, waterLevel ?? 0.22, W, H), 0, 0);
                terrainStaleRef.current = false;
            }
            ctx.drawImage(terrOff, 0, 0); // 1:1 — no upscaling needed

            // ── Smooth marching-squares contour helper ──────────────────────
            // For each grid cell, linearly interpolates the exact crossing position
            // on each edge so contour lines are smooth instead of blocky diagonals.
            const drawContour = (level) => {
                ctx.beginPath();
                for (let gy = 0; gy < gh - 1; gy++) {
                    for (let gx = 0; gx < gw - 1; gx++) {
                        const h00 = heightmap[ gy      * gw + gx    ];
                        const h10 = heightmap[ gy      * gw + gx + 1];
                        const h01 = heightmap[(gy + 1) * gw + gx    ];
                        const h11 = heightmap[(gy + 1) * gw + gx + 1];

                        // Marching-squares case index (bits: TL=8, TR=4, BR=2, BL=1)
                        const idx = ((h00 >= level) ? 8 : 0)
                                  | ((h10 >= level) ? 4 : 0)
                                  | ((h11 >= level) ? 2 : 0)
                                  | ((h01 >= level) ? 1 : 0);
                        if (idx === 0 || idx === 15) continue;

                        const x0 = gx * GRID_RES, x1 = (gx + 1) * GRID_RES;
                        const y0 = gy * GRID_RES, y1 = (gy + 1) * GRID_RES;

                        // Linear interpolation along an edge
                        const lerpX = (ha, hb) => x0 + ((level - ha) / (hb - ha)) * (x1 - x0);
                        const lerpY = (ha, hb) => y0 + ((level - ha) / (hb - ha)) * (y1 - y0);

                        // Collect interpolated crossing points for each cell edge
                        const pts = [];
                        if ((h00 >= level) !== (h10 >= level)) pts.push([lerpX(h00, h10), y0]); // top
                        if ((h10 >= level) !== (h11 >= level)) pts.push([x1, lerpY(h10, h11)]); // right
                        if ((h01 >= level) !== (h11 >= level)) pts.push([lerpX(h01, h11), y1]); // bottom
                        if ((h00 >= level) !== (h01 >= level)) pts.push([x0, lerpY(h00, h01)]); // left

                        if (pts.length >= 2) {
                            ctx.moveTo(pts[0][0], pts[0][1]);
                            ctx.lineTo(pts[1][0], pts[1][1]);
                        }
                        // Saddle case (4 crossings) — draw the second segment too
                        if (pts.length === 4) {
                            ctx.moveTo(pts[2][0], pts[2][1]);
                            ctx.lineTo(pts[3][0], pts[3][1]);
                        }
                    }
                }
                ctx.stroke();
            };

            // Shore line at the water boundary
            const wl = waterLevel ?? 0.22;
            ctx.save();
            ctx.strokeStyle = 'rgba(56,189,248,0.55)'; // sky-400
            ctx.lineWidth   = 1.2;
            drawContour(wl);

            // Elevation contour lines on dry land only
            const CONTOUR_LEVELS = [0.35, 0.55, 0.72, 0.88];
            ctx.lineWidth = 0.6;
            for (const level of CONTOUR_LEVELS) {
                ctx.strokeStyle = level > 0.65
                    ? 'rgba(120,80,40,0.18)'
                    : 'rgba(60,120,60,0.14)';
                drawContour(level);
            }
            ctx.restore();
        }

        // ── Subtle grid ────────────────────────────────────────────────
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
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
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(off, 0, 0, W, H); // stretch to full canvas with smoothing
            ctx.imageSmoothingEnabled = false;
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
            // Don't render ants that are still inside the nest
            const adx = ant.x - nest.x, ady = ant.y - nest.y;
            if (adx * adx + ady * ady < nest.radius * nest.radius) continue;
            // Frustrated = searching too long OR gave up (returning without food)
            const frustration = !ant.hasFood
                ? Math.max(0, Math.min(1, (ant.stepsSinceFood - 1200) / 1200))
                : 0;
            drawCircle(ctx, ant.x, ant.y, ant.angle, isReturning && ant.hasFood, frustration, ant.isScout, isDark);
        }
        ctx.globalAlpha = 1;

        // ── Placement preview (while pointer held) ───────────────────────────
        const press = pressingRef.current;
        if (press) {
            const pressElapsed = performance.now() - press.downTime;
            const scale = Math.min(4, 1 + (pressElapsed / 2000) * 3);
            const previewR = 14 * scale; // 14 px ≈ midpoint of min/max food radius
            // Outer glow ring
            const pgrd = ctx.createRadialGradient(press.x, press.y, previewR * 0.5, press.x, press.y, previewR + 10);
            pgrd.addColorStop(0, 'rgba(34,197,94,0.18)');
            pgrd.addColorStop(1, 'rgba(34,197,94,0)');
            ctx.fillStyle = pgrd;
            ctx.beginPath();
            ctx.arc(press.x, press.y, previewR + 10, 0, Math.PI * 2);
            ctx.fill();
            // Dashed border circle
            ctx.save();
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = 'rgba(34,197,94,0.75)';
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.arc(press.x, press.y, previewR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            // Label showing approx food amount
            const approxAmount = Math.round(80 * scale); // 80 = midpoint of 40-120
            ctx.fillStyle    = 'rgba(20,83,45,0.85)';
            ctx.font         = 'bold 10px -apple-system, sans-serif';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${approxAmount}`, press.x, press.y);
        }

        // ── Update live DOM stats ─────────────────────────────────────────────
        const { antsDied, tick, queenHungerTimer, queenStarvationThreshold } = sim.getState();
        // Elapsed wall-clock duration
        const elapsed = elapsedMsRef.current + (
            (lastResumeRef.current !== null && !isPausedRef.current)
                ? performance.now() - lastResumeRef.current
                : 0
        );
        if (tickLabelRef.current) tickLabelRef.current.textContent = formatDuration(elapsed);
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
            const health = queenDead ? 0 : Math.max(0, 1 - queenHungerTimer / queenStarvationThreshold);
            const status = queenDead
                ? '☠ Queen dead'
                : health > 0.6 ? 'Queen · Healthy'
                : health > 0.3 ? 'Queen · Hungry'
                : 'Queen · Critical';
            queenStatusRef.current.textContent = status;
            queenStatusRef.current.style.color = queenDead ? '#ef4444' : health <= 0.3 ? '#ea580c' : '';
        }
        // ── Chart sampling (every 100 sim-ticks) ─────────────────────────────
        const remainOnScreen = foodSources.reduce((s, f) => s + f.amount, 0);
        const CHART_SAMPLE = 100;
        if (tick > 0 && tick - lastChartTickRef.current >= CHART_SAMPLE) {
            lastChartTickRef.current = tick;
            const newFood = [...chartDataRef.current[0].data, { x: elapsed, y: Math.round(remainOnScreen) }];
            const newPop  = [...chartDataRef.current[1].data, { x: elapsed, y: ants.length }];
            chartDataRef.current = [
                { ...chartDataRef.current[0], data: newFood },
                { ...chartDataRef.current[1], data: newPop  },
            ];
            setChartData([...chartDataRef.current]);
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

        // Stop automatically once the queen is dead and all ants have died
        const state = simRef.current?.getState();
        if (state && state.queenDead && state.ants.length === 0) {
            isRunningRef.current = false;
            setIsRunning(false);
            return;
        }

        rafRef.current = requestAnimationFrame(animate);
    }, [render]);

    // ── Actions ─────────────────────────────────────────────────────────────

    const handleStart = () => {
        if (isRunningRef.current) return;
        if (!simRef.current) buildSim();
        isRunningRef.current  = true;
        isPausedRef.current   = false;
        lastResumeRef.current = performance.now();
        setIsRunning(true);
        setIsPaused(false);
        rafRef.current = requestAnimationFrame(animate);
    };

    const handlePause = () => {
        if (!isRunningRef.current) return;
        const nowPaused = !isPausedRef.current;
        if (nowPaused) {
            // accumulate elapsed before pausing
            elapsedMsRef.current += performance.now() - (lastResumeRef.current ?? performance.now());
            lastResumeRef.current = null;
        } else {
            // resuming
            lastResumeRef.current = performance.now();
        }
        isPausedRef.current = nowPaused;
        setIsPaused(nowPaused);
    };

    const handleReset = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        isRunningRef.current  = false;
        isPausedRef.current   = false;
        elapsedMsRef.current  = 0;
        lastResumeRef.current = null;
        if (tickLabelRef.current) tickLabelRef.current.textContent = '0:00';
        setIsRunning(false);
        setIsPaused(false);
        // Reset chart
        const empty = [
            { id: 'Food',       color: '#22c55e', data: [] },
            { id: 'Population', color: '#3b82f6', data: [] },
        ];
        chartDataRef.current   = empty.map(s => ({ ...s }));
        lastChartTickRef.current = -1;
        setChartData([...empty]);
        setTimeout(() => {
            buildSim();
            render();
        }, 20);
    };

    // ── Canvas food-placement interaction ─────────────────────────────────────
    const canvasToSim = useCallback((e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (W / rect.width),
            y: (e.clientY - rect.top)  * (H / rect.height),
        };
    }, []);

    // Preview rAF loop — runs only while pointer is held and sim is idle/paused
    const runPreviewLoop = useCallback(() => {
        if (!pressingRef.current) return;
        render();
        previewRafRef.current = requestAnimationFrame(runPreviewLoop);
    }, [render]);

    const stopPress = useCallback(() => {
        pressingRef.current = null;
        if (previewRafRef.current) {
            cancelAnimationFrame(previewRafRef.current);
            previewRafRef.current = null;
        }
    }, []);

    const handleCanvasPointerDown = useCallback((e) => {
        const { x, y } = canvasToSim(e);
        pressingRef.current = { x, y, downTime: performance.now() };
        canvasRef.current?.setPointerCapture(e.pointerId);
        // Start preview loop if sim is not actively ticking
        if (!isRunningRef.current || isPausedRef.current) {
            previewRafRef.current = requestAnimationFrame(runPreviewLoop);
        }
    }, [canvasToSim, runPreviewLoop]);

    const handleCanvasPointerMove = useCallback((e) => {
        if (!pressingRef.current) return;
        const { x, y } = canvasToSim(e);
        pressingRef.current = { ...pressingRef.current, x, y };
    }, [canvasToSim]);

    const handleCanvasPointerUp = useCallback(() => {
        const press = pressingRef.current;
        if (!press) return;
        const pressElapsed = performance.now() - press.downTime;
        const scale = Math.min(4, 1 + (pressElapsed / 2000) * 3);
        stopPress();
        if (!simRef.current) return;
        const placed = simRef.current.addFoodAt(press.x, press.y, scale);
        if (placed && (!isRunningRef.current || isPausedRef.current)) render();
    }, [stopPress, render]);

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
            if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
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
                <canvas
                    ref={canvasRef}
                    className="antcolony-canvas"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={handleCanvasPointerDown}
                    onPointerMove={handleCanvasPointerMove}
                    onPointerUp={handleCanvasPointerUp}
                    onPointerLeave={handleCanvasPointerUp}
                    onPointerCancel={handleCanvasPointerUp}
                />
            </div>

            {/* ── Stats + Legend row ──────────────────────────────────────── */}
            <div className="aco-meta-row">
                <div className="antcolony-stat-bar">
                    <span className="stat-pill stat-pill-tick">
                        <span className="pill-label">Time</span>
                        <strong ref={tickLabelRef} style={{ minWidth: '3.5ch' }}>0:00</strong>
                    </span>
                    <span className="stat-pill stat-pill-searching">
                        <span className="pill-dot" />
                        <span className="pill-label">Searching</span>
                        <strong ref={searchingRef}>0</strong>
                    </span>
                    <span className="stat-pill stat-pill-returning">
                        <span className="pill-dot" />
                        <span className="pill-label">Returning</span>
                        <strong ref={returningRef}>0</strong>
                    </span>
                    <span className="stat-pill stat-pill-died">
                        <span className="pill-dot" />
                        <span className="pill-label">Died</span>
                        <strong ref={diedLabelRef}>0</strong>
                    </span>
                    <span className="stat-pill stat-pill-population">
                        <span className="pill-dot" />
                        <span className="pill-label">Population</span>
                        <strong ref={populationRef}>0</strong>
                    </span>
                    <span className="stat-pill stat-pill-progress stat-pill-queen">
                        <span className="progress-pip" ref={queenBarRef} style={{ width: '100%' }} />
                        <span className="progress-pip-text" ref={queenStatusRef}>Queen · Healthy</span>
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

            {/* ── Population & Food chart ──────────────────────────────── */}
            {chartData[0].data.length > 1 && (
                <div className="aco-chart-wrap">
                    <div className="aco-chart-header">
                        <p className="aco-chart-title">Food available &amp; Population over time</p>
                        <div className="aco-chart-legend">
                            {chartData.map(s => (
                                <span key={s.id} className="aco-legend-item">
                                    <span className="aco-legend-swatch" style={{ background: s.color }} />
                                    {s.id}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div style={{ height: 180 }}>
                        <ResponsiveLine
                            data={chartData}
                            margin={{ top: 8, right: 16, bottom: 44, left: 48 }}
                            xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
                            yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
                            axisTop={null}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 4,
                                tickPadding: 4,
                                tickValues: 6,
                                legend: 'Time',
                                legendOffset: 34,
                                legendPosition: 'middle',
                                format: v => formatDuration(v),
                            }}
                            axisLeft={{
                                tickSize: 4,
                                tickPadding: 4,
                                tickValues: 5,
                            }}
                            colors={d => d.color}
                            lineWidth={1.5}
                            enablePoints={false}
                            enableGridX={false}
                            enableArea={false}
                            useMesh={true}
                            enableTouchCrosshair={true}
                            theme={{
                                axis: {
                                    ticks: { text: { fontSize: 10, fill: '#71717a' } },
                                    legend: { text: { fontSize: 10, fill: '#71717a' } },
                                },
                                grid: { line: { stroke: '#e4e4e7', strokeWidth: 1 } },
                            }}
                            tooltip={({ point }) => (
                                <div className="aco-chart-tooltip">
                                    <span style={{ color: point.color }}>&#9632;</span>{' '}
                                    {point.serieId}: <strong>{point.data.y}</strong>
                                    <span style={{ color: '#a1a1aa', marginLeft: 6 }}>{formatDuration(point.data.xFormatted ?? point.data.x)}</span>
                                </div>
                            )}
                        />
                    </div>
                </div>
            )}



        </div>
    );
}
