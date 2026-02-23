/**
 * Ant Colony Optimization Algorithm
 * Solves the Traveling Salesman Problem using swarm intelligence
 */

export class AntColonyOptimization {
    constructor(cities, numAnts = 30, numIterations = 100, evaporationRate = 0.5, alpha = 1, beta = 2, q = 100) {
        this.cities = cities; // Array of {x, y} coordinates
        this.numAnts = numAnts;
        this.numIterations = numIterations;
        this.evaporationRate = evaporationRate; // How much pheromone evaporates
        this.alpha = alpha; // Influence of pheromone
        this.beta = beta; // Influence of heuristic (distance)
        this.q = q; // Pheromone deposit factor
        this.numCities = cities.length;
        
        this.distances = this.calculateDistances();
        this.pheromones = this.initializePheromones();
        this.bestPath = null;
        this.bestCost = Infinity;
        this.convergenceHistory = [];
    }

    calculateDistances() {
        const distances = Array(this.numCities).fill(0).map(() => Array(this.numCities).fill(0));
        for (let i = 0; i < this.numCities; i++) {
            for (let j = i; j < this.numCities; j++) {
                const dx = this.cities[i].x - this.cities[j].x;
                const dy = this.cities[i].y - this.cities[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                distances[i][j] = distance;
                distances[j][i] = distance;
            }
        }
        return distances;
    }

    initializePheromones() {
        const initialPheromone = 1 / (this.numCities * this.getAveragePathLength());
        return Array(this.numCities).fill(0).map(() => 
            Array(this.numCities).fill(initialPheromone)
        );
    }

    getAveragePathLength() {
        let total = 0;
        for (let i = 0; i < this.numCities; i++) {
            total += this.distances[i][(i + 1) % this.numCities];
        }
        return total / this.numCities;
    }

    constructAntPath(ant) {
        const path = [0]; // Start at city 0
        const visited = new Set([0]);

        while (visited.size < this.numCities) {
            const current = path[path.length - 1];
            const next = this.selectNextCity(current, visited);
            path.push(next);
            visited.add(next);
        }

        return path;
    }

    selectNextCity(current, visited) {
        const probabilities = [];
        let sum = 0;

        for (let j = 0; j < this.numCities; j++) {
            if (visited.has(j)) {
                probabilities.push(0);
            } else {
                const pheromone = Math.pow(this.pheromones[current][j], this.alpha);
                const heuristic = Math.pow(1 / this.distances[current][j], this.beta);
                const probability = pheromone * heuristic;
                probabilities.push(probability);
                sum += probability;
            }
        }

        // Roulette wheel selection
        const r = Math.random() * sum;
        let cumulative = 0;
        for (let j = 0; j < this.numCities; j++) {
            cumulative += probabilities[j];
            if (r <= cumulative) {
                return j;
            }
        }

        return probabilities.indexOf(Math.max(...probabilities));
    }

    calculatePathCost(path) {
        let cost = 0;
        for (let i = 0; i < path.length; i++) {
            const from = path[i];
            const to = path[(i + 1) % path.length];
            cost += this.distances[from][to];
        }
        return cost;
    }

    updatePheromones(ants) {
        // Evaporation
        for (let i = 0; i < this.numCities; i++) {
            for (let j = 0; j < this.numCities; j++) {
                this.pheromones[i][j] *= (1 - this.evaporationRate);
            }
        }

        // Deposition
        for (const ant of ants) {
            const cost = ant.cost;
            const delta = this.q / cost;

            for (let i = 0; i < ant.path.length; i++) {
                const from = ant.path[i];
                const to = ant.path[(i + 1) % ant.path.length];
                this.pheromones[from][to] += delta;
                this.pheromones[to][from] += delta;
            }
        }
    }

    iterate(callback = null) {
        const iterationHistory = [];

        for (let iteration = 0; iteration < this.numIterations; iteration++) {
            // Construct new ant solutions
            const ants = [];
            for (let i = 0; i < this.numAnts; i++) {
                const path = this.constructAntPath();
                const cost = this.calculatePathCost(path);
                ants.push({ path, cost });

                // Update best solution
                if (cost < this.bestCost) {
                    this.bestCost = cost;
                    this.bestPath = [...path];
                }
            }

            // Update pheromones
            this.updatePheromones(ants);

            // Record convergence history
            iterationHistory.push({
                iteration,
                bestCost: this.bestCost,
                ants: ants.map(a => ({ path: a.path, cost: a.cost }))
            });

            this.convergenceHistory.push(this.bestCost);

            if (callback) {
                callback({
                    iteration,
                    progress: (iteration + 1) / this.numIterations,
                    bestCost: this.bestCost,
                    bestPath: this.bestPath,
                    currentAnts: ants,
                    pheromones: this.pheromones
                });
            }
        }

        return {
            bestPath: this.bestPath,
            bestCost: this.bestCost,
            convergenceHistory: this.convergenceHistory,
            iterationDetails: iterationHistory
        };
    }

    getBestPath() {
        return this.bestPath;
    }

    getBestCost() {
        return this.bestCost;
    }

    getPheromones() {
        return this.pheromones;
    }

    getConvergenceHistory() {
        return this.convergenceHistory;
    }
}

/**
 * Generate random cities in a 2D space with a minimum distance between each pair.
 */
export function generateRandomCities(count, width, height, seed = null, padding = 30, minDist = 48) {
    const cities = [];
    const usableW = width - padding * 2;
    const usableH = height - padding * 2;

    // Lower minDist automatically if the canvas is too small to fit all cities
    const area = usableW * usableH;
    const maxPossible = Math.floor(area / (Math.PI * (minDist / 2) ** 2));
    const effectiveMinDist = count > maxPossible ? Math.sqrt(area / (count * Math.PI)) * 0.9 : minDist;

    // Use seed for reproducibility if provided
    let rng = seed !== null ? mulberry32(seed) : Math.random;

    const maxAttempts = 1000;

    for (let i = 0; i < count; i++) {
        let placed = false;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = padding + rng() * usableW;
            const y = padding + rng() * usableH;
            const tooClose = cities.some(c => {
                const dx = c.x - x, dy = c.y - y;
                return Math.sqrt(dx * dx + dy * dy) < effectiveMinDist;
            });
            if (!tooClose) {
                cities.push({ x, y, id: i });
                placed = true;
                break;
            }
        }
        // Fallback: place anywhere if no valid spot found after maxAttempts
        if (!placed) {
            cities.push({
                x: padding + rng() * usableW,
                y: padding + rng() * usableH,
                id: i
            });
        }
    }

    return cities;
}

/**
 * Mulberry32 - simple seeded random number generator
 */
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 * Calculate total distance of a path
 */
export function calculateTotalDistance(path, cities) {
    let total = 0;
    for (let i = 0; i < path.length; i++) {
        const from = path[i];
        const to = path[(i + 1) % path.length];
        const dx = cities[from].x - cities[to].x;
        const dy = cities[from].y - cities[to].y;
        total += Math.sqrt(dx * dx + dy * dy);
    }
    return total;
}
