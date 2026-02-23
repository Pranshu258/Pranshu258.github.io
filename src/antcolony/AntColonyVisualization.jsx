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
    const speedRef = useRef(3);

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
    const [speed, setSpeed] = useState(3);

    // Visualization options
    const [showPheromones, setShowPheromones] = useState(true);
    const [showTrails, setShowTrails] = useState(true);
    const [showBestPath, setShowBestPath] = useState(true);

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

    // Keep speed ref in sync
    useEffect(() => { speedRef.current = speed; }, [speed]);

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
        const cities = generateRandomCities(citiesCount, 760, 480);
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

    const runACO = useCallback((aco) => {
        const viz = visualizerRef.current;
        if (!aco || !viz) return;

        isRunningRef.current = true;
        isPausedRef.current = false;
        setIsRunning(true);
        setIsPaused(false);

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

                setStats({
                    iteration: frame,
                    bestCost: aco.bestCost === Infinity ? 0 : Math.round(aco.bestCost),
                    currentCost: Math.round(ants[0]?.cost || 0),
                    progress: (frame / totalIterations) * 100
                });
            }

            viz.render();

            if (frame < totalIterations) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                isRunningRef.current = false;
                setIsRunning(false);
            }
        };

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // Draw initial cities on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (visualizerRef.current && !acoRef.current) {
                initializeACO();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStart = () => {
        if (isRunningRef.current) return;
        const aco = initializeACO();
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
        setTimeout(() => initializeACO(), 20);
    };

    return (
        <div className="antcolony-container">

            {/* ── Canvas ──────────────────────────────────────────── */}
            <div className="antcolony-canvas-wrap">
                <canvas ref={canvasRef} className="antcolony-canvas" width={800} height={520} />

                {/* live stat pills overlaid at the bottom of the canvas */}
                <div className="antcolony-stat-bar">
                    <span className="stat-pill">
                        Iter <strong>{stats.iteration}</strong>/{numIterations}
                    </span>
                    <span className="stat-pill">
                        Best <strong>{stats.bestCost || '—'}</strong>
                    </span>
                    <span className="stat-pill stat-pill-progress">
                        <span className="progress-pip" style={{ width: `${stats.progress}%` }} />
                        <span className="progress-pip-text">{Math.round(stats.progress)}%</span>
                    </span>
                    <span className="stat-pill">
                        Cities <strong>{numCities}</strong>
                    </span>
                    <span className="stat-pill">
                        Ants <strong>{numAnts}</strong>
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
                    <div className="control-group">
                        <label>Speed <span className="value">{speed}</span></label>
                        <input type="range" min="1" max="20" value={speed}
                            onChange={(e) => setSpeed(parseInt(e.target.value))}
                            className="slider" />
                    </div>
                    <div className="control-group aco-toggles">
                        <label>Show</label>
                        <div className="aco-toggle-row">
                            <label className="aco-toggle">
                                <input type="checkbox" checked={showPheromones}
                                    onChange={(e) => setShowPheromones(e.target.checked)} />
                                Pheromones
                            </label>
                            <label className="aco-toggle">
                                <input type="checkbox" checked={showTrails}
                                    onChange={(e) => setShowTrails(e.target.checked)} />
                                Ant paths
                            </label>
                            <label className="aco-toggle">
                                <input type="checkbox" checked={showBestPath}
                                    onChange={(e) => setShowBestPath(e.target.checked)} />
                                Best path
                            </label>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
