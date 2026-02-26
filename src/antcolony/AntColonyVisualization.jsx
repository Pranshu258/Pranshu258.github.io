import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AntColonyOptimization, generateRandomCities } from './aco';
import { ACOVisualizer } from './AntColonyCanvas';
import '../styles/antcolony.css';

export default function AntColonyVisualization() {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const acoRef = useRef(null);
    const visualizerRef = useRef(null);
    const isPausedRef = useRef(false);
    const isRunningRef = useRef(false);
    const speedRef = useRef(1);
    const progressPipRef = useRef(null);
    const iterTextRef = useRef(null);
    const citiesRef = useRef([]);

    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [stats, setStats] = useState({
        iteration: 0,
        bestCost: 0,
        currentCost: 0,
        progress: 0
    });

    // Parameters
    const [numCities, setNumCities] = useState(15);
    const [numAnts, setNumAnts] = useState(20);
    const [numIterations, setNumIterations] = useState(150);
    const [evaporationRate, setEvaporationRate] = useState(0.5);
    const [alpha, setAlpha] = useState(1);
    const [beta, setBeta] = useState(2);


    // Visualization options
    const [showPheromones, setShowPheromones] = useState(true);
    const [showTrails, setShowTrails] = useState(true);
    const [showBestPath, setShowBestPath] = useState(true);
    const [panelOpen, setPanelOpen] = useState(true);

    // Refs to avoid stale closures inside rAF loop
    const showPheromonesRef = useRef(true);
    const showTrailsRef = useRef(true);
    const showBestPathRef = useRef(true);

    // Initialize visualizer once on mount
    useEffect(() => {
        if (canvasRef.current && !visualizerRef.current) {
            visualizerRef.current = new ACOVisualizer(canvasRef.current, 800, 520);
        }
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
    }, []);

    // Sync display toggle refs and re-render
    useEffect(() => {
        showPheromonesRef.current = showPheromones;
        showTrailsRef.current = showTrails;
        showBestPathRef.current = showBestPath;
        if (visualizerRef.current) {
            visualizerRef.current.setShowPheromones(showPheromones);
            visualizerRef.current.setShowTrails(showTrails);
            visualizerRef.current.setShowBestPath(showBestPath);
            visualizerRef.current.render();
        }
    }, [showPheromones, showTrails, showBestPath]);

    const initializeACO = useCallback((
        citiesCount = numCities,
        antsCount = numAnts,
        iterationsCount = numIterations,
        evap = evaporationRate,
        a = alpha,
        b = beta
    ) => {
        const cities = generateRandomCities(citiesCount, 800, 520);
        citiesRef.current = cities;
        const aco = new AntColonyOptimization(cities, antsCount, iterationsCount, evap, a, b);
        acoRef.current = aco;

        const viz = visualizerRef.current;
        if (viz) {
            viz.cities = cities;
            viz.bestPath = [];
            viz.currentAnts = [];
            viz.pheromones = [];
            viz.render();
        }

        setStats({ iteration: 0, bestCost: 0, currentCost: 0, progress: 0 });
        return aco;
    }, [numCities, numAnts, numIterations, evaporationRate, alpha, beta]);

    const initializeACOFromCurrentCities = useCallback((
        antsCount = numAnts,
        iterationsCount = numIterations,
        evap = evaporationRate,
        a = alpha,
        b = beta
    ) => {
        if (!citiesRef.current || citiesRef.current.length === 0) {
            return initializeACO(numCities, antsCount, iterationsCount, evap, a, b);
        }

        const cities = [...citiesRef.current];
        const aco = new AntColonyOptimization(cities, antsCount, iterationsCount, evap, a, b);
        acoRef.current = aco;

        const viz = visualizerRef.current;
        if (viz) {
            viz.cities = cities;
            viz.bestPath = [];
            viz.currentAnts = [];
            viz.pheromones = [];
            viz.render();
        }

        setStats({ iteration: 0, bestCost: 0, currentCost: 0, progress: 0 });
        return aco;
    }, [numCities, numAnts, numIterations, evaporationRate, alpha, beta, initializeACO]);

    const runACO = useCallback((aco) => {
        const viz = visualizerRef.current;
        if (!aco || !viz) return;

        isRunningRef.current = true;
        isPausedRef.current = false;
        setIsRunning(true);
        setIsPaused(false);

        // Always show trails during the run
        setShowPheromones(true);
        setShowTrails(true);
        showPheromonesRef.current = true;
        showTrailsRef.current = true;

        const totalIterations = aco.numIterations;
        const antsCount = aco.numAnts;
        let frame = 0;

        const animate = () => {
            if (!isRunningRef.current) return;

            if (isPausedRef.current) {
                animationRef.current = requestAnimationFrame(animate);
                return;
            }

            const iterationsPerFrame = Math.max(1, speedRef.current);

            for (let i = 0; i < iterationsPerFrame; i++) {
                if (frame >= totalIterations) break;

                const ants = [];
                for (let j = 0; j < antsCount; j++) {
                    const path = aco.constructAntPath();
                    const cost = aco.calculatePathCost(path);
                    ants.push({ path, cost });
                    if (cost < aco.bestCost) {
                        aco.bestCost = cost;
                        aco.bestPath = [...path];
                    }
                }
                aco.updatePheromones(ants);
                frame++;

                viz.setShowPheromones(showPheromonesRef.current);
                viz.setShowTrails(showTrailsRef.current);
                viz.setShowBestPath(showBestPathRef.current);
                viz.update({
                    cities: aco.cities,
                    currentAnts: ants.slice(0, 8),
                    bestPath: aco.bestPath,
                    pheromones: aco.pheromones
                });

                // Update progress pip and iter text directly — bypasses React batching
                const pct = (frame / totalIterations) * 100;
                if (progressPipRef.current) progressPipRef.current.style.width = pct + '%';
                if (iterTextRef.current) iterTextRef.current.textContent = frame;

                setStats({
                    iteration: frame,
                    bestCost: aco.bestCost === Infinity ? 0 : Math.round(aco.bestCost),
                    currentCost: Math.round(ants[0]?.cost || 0),
                    progress: pct
                });
            }

            viz.render();

            if (frame < totalIterations) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                isRunningRef.current = false;
                setIsRunning(false);
                // Hide trails so only the best path is shown
                setShowPheromones(false);
                setShowTrails(false);
                showPheromonesRef.current = false;
                showTrailsRef.current = false;
                viz.setShowPheromones(false);
                viz.setShowTrails(false);
                viz.render();
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // Run ACO to completion on mount so we start with a solved state
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!visualizerRef.current || acoRef.current) return;

            const aco = initializeACO();
            if (!aco) return;

            // Run all iterations synchronously
            for (let frame = 0; frame < aco.numIterations; frame++) {
                const ants = [];
                for (let j = 0; j < aco.numAnts; j++) {
                    const path = aco.constructAntPath();
                    const cost = aco.calculatePathCost(path);
                    ants.push({ path, cost });
                    if (cost < aco.bestCost) {
                        aco.bestCost = cost;
                        aco.bestPath = [...path];
                    }
                }
                aco.updatePheromones(ants);
            }

            // Display only the best path (no pheromone/ant trails)
            const viz = visualizerRef.current;
            viz.setShowPheromones(false);
            viz.setShowTrails(false);
            viz.setShowBestPath(true);
            viz.update({
                cities: aco.cities,
                currentAnts: [],
                bestPath: aco.bestPath,
                pheromones: aco.pheromones
            });
            viz.render();

            // Sync toggle state
            setShowPheromones(false);
            setShowTrails(false);

            // Update stats UI
            const finalCost = aco.bestCost === Infinity ? 0 : Math.round(aco.bestCost);
            if (progressPipRef.current) progressPipRef.current.style.width = '100%';
            if (iterTextRef.current) iterTextRef.current.textContent = aco.numIterations;
            setStats({
                iteration: aco.numIterations,
                bestCost: finalCost,
                currentCost: finalCost,
                progress: 100
            });
        }, 50);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStart = () => {
        if (isRunningRef.current) return;
        const aco = initializeACOFromCurrentCities();
        runACO(aco);
    };

    const handlePause = () => {
        if (!isRunningRef.current) return;
        const newPaused = !isPausedRef.current;
        isPausedRef.current = newPaused;
        setIsPaused(newPaused);
    };

    const handleReset = () => {
        isRunningRef.current = false;
        isPausedRef.current = false;
        setIsRunning(false);
        setIsPaused(false);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (progressPipRef.current) progressPipRef.current.style.width = '0%';
        if (iterTextRef.current) iterTextRef.current.textContent = '0';
        setTimeout(() => initializeACO(), 20);
    };

    return (
        <div className="antcolony-container">

            {/* ── Canvas ──────────────────────────────────────────── */}
            <div className="antcolony-canvas-wrap">
                <canvas ref={canvasRef} className="antcolony-canvas" />
            </div>

            {/* ── Stats + Legend ───────────────────────────────── */}
            <div className="aco-meta-row">
                <div className="antcolony-stat-bar">
                    <span className="stat-pill stat-pill-progress">
                        <span className="progress-pip" ref={progressPipRef} style={{ width: '0%' }} />
                        <span className="progress-pip-text">Iter <strong ref={iterTextRef}>0</strong>/{numIterations}</span>
                    </span>
                    <span className="stat-pill">
                        Best <strong>{stats.bestCost || '—'}</strong>
                    </span>
                    <span className="stat-pill">
                        Cities <strong>{numCities}</strong>
                    </span>
                    <span className="stat-pill">
                        Ants <strong>{numAnts}</strong>
                    </span>
                </div>
                <div className="aco-legend">
                    <span
                        className={`aco-legend-item aco-legend-toggle${showPheromones ? '' : ' aco-legend-off'}`}
                        onClick={() => setShowPheromones(v => !v)}
                        title="Toggle pheromone trails"
                    >
                        <span className="aco-legend-swatch" style={{ background: '#fde68a', border: '1.5px solid #f59e0b' }} />
                        Pheromone trails
                    </span>
                    <span
                        className={`aco-legend-item aco-legend-toggle${showTrails ? '' : ' aco-legend-off'}`}
                        onClick={() => setShowTrails(v => !v)}
                        title="Toggle ant paths"
                    >
                        <span className="aco-legend-swatch" style={{ background: '#5eead4', border: '1.5px solid #0d9488' }} />
                        Ant paths
                    </span>
                    <span
                        className={`aco-legend-item aco-legend-toggle${showBestPath ? '' : ' aco-legend-off'}`}
                        onClick={() => setShowBestPath(v => !v)}
                        title="Toggle best path"
                    >
                        <span className="aco-legend-swatch" style={{ background: '#d97706' }} />
                        Best path
                    </span>
                    <span className="aco-legend-item">
                        <span className="aco-legend-swatch aco-legend-city" style={{ background: '#2563eb', borderRadius: '50%' }} />
                        Cities
                    </span>
                </div>
            </div>

            {/* ── Action buttons ──────────────────────────────────── */}
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

            {/* ── Compact parameter panel ─────────────────────────── */}
            <div className="antcolony-info-panel">
                <button className="aco-panel-header" onClick={() => setPanelOpen(v => !v)}>
                    <span>Parameters</span>
                    <svg className={`aco-panel-chevron${panelOpen ? ' open' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>
                <div className={`aco-panel-body${panelOpen ? ' open' : ''}`}>
                    <div className="aco-panel-inner">
                    <div className="aco-params-grid">
                    <div className="control-group">
                        <label>Cities <span className="value">{numCities}</span></label>
                        <input type="range" min="5" max="40" value={numCities}
                            onChange={(e) => setNumCities(parseInt(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                    <div className="control-group">
                        <label>Ants <span className="value">{numAnts}</span></label>
                        <input type="range" min="5" max="80" value={numAnts}
                            onChange={(e) => setNumAnts(parseInt(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                    <div className="control-group">
                        <label>Iterations <span className="value">{numIterations}</span></label>
                        <input type="range" min="10" max="500" value={numIterations}
                            onChange={(e) => setNumIterations(parseInt(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                    <div className="control-group">
                        <label>Evaporation <span className="value">{evaporationRate.toFixed(2)}</span></label>
                        <input type="range" min="0.05" max="0.95" step="0.05" value={evaporationRate}
                            onChange={(e) => setEvaporationRate(parseFloat(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                    <div className="control-group">
                        <label>α pheromone <span className="value">{alpha.toFixed(1)}</span></label>
                        <input type="range" min="0.1" max="5" step="0.1" value={alpha}
                            onChange={(e) => setAlpha(parseFloat(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                    <div className="control-group">
                        <label>β distance <span className="value">{beta.toFixed(1)}</span></label>
                        <input type="range" min="0.1" max="5" step="0.1" value={beta}
                            onChange={(e) => setBeta(parseFloat(e.target.value))}
                            disabled={isRunning} className="slider" />
                    </div>
                </div>
                    </div>
            </div>
            </div>
        </div>
    );
}
