/**
 * Ant Foraging Simulation using ACO principles
 *
 * Ants emerge from a nest, wander the environment reacting to pheromone trails,
 * collect food from sources, and return home — laying pheromones on the way back.
 * Shorter, more efficient trails receive stronger reinforcement (ACO core idea).
 *
 * Pheromone model:
 *   - Single layer: "food trail" pheromone deposited by returning ants.
 *   - Searching ants sense the pheromone and steer toward higher concentrations.
 *   - Pheromone evaporates each tick; diffuses slightly for a natural look.
 *
 * Ant states:
 *   SEARCHING  — random walk biased by pheromone; picks up food when near source.
 *   RETURNING  — steers toward nest, depositing pheromone; drops food at nest.
 */

export const GRID_RES = 4;  // pixels per pheromone grid cell
const SEPARATION_DIST = 8;  // minimum centre-to-centre distance between ants (px)

// ─── Ant ─────────────────────────────────────────────────────────────────────

class Ant {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.state   = 'SEARCHING'; // 'SEARCHING' | 'RETURNING'
        this.hasFood = false;         // true only when carrying collected food
        // Accumulated steps while searching — used to weight pheromone deposit.
        // Fewer steps → shorter path → more pheromone (like 1/L in classic ACO).
        this.stepsSinceFood = 0;
    }
}

// ─── Simulation ──────────────────────────────────────────────────────────────

export class AntForagingSimulation {
    /**
     * @param {number} width  Canvas width in pixels
     * @param {number} height Canvas height in pixels
     * @param {object} params Tunable parameters
     */
    constructor(width, height, params = {}) {
        this.width  = width;
        this.height = height;

        // Grid dimensions for pheromone storage
        this.gw = Math.ceil(width  / GRID_RES);
        this.gh = Math.ceil(height / GRID_RES);

        // ── Tuneable parameters ──────────────────────────────────────────────
        this.evapRate      = params.evapRate      ?? 0.004;  // per tick — real half-life 10–30 min, compressed ~6000:1
        this.diffuseRate   = params.diffuseRate   ?? 0.08;   // pheromone bleed to neighbours
        this.depositAmount = params.depositAmount ?? 14;     // base deposit per cell
        this.antSpeed      = params.antSpeed      ?? 0.35;   // px/tick — real ~1 cm/s at 2px/mm, 60fps
        this.sensorDist    = params.sensorDist    ?? 8;      // px — real 2–5 mm ≈ 1 body length
        this.sensorAngle   = params.sensorAngle   ?? Math.PI / 5; // radians between sensors
        this.turnSpeed     = params.turnSpeed     ?? 0.35;   // radians of max steer per tick
        this.randomTurn    = params.randomTurn    ?? 0.22;   // random walk noise
        this.numAnts          = params.numAnts          ?? 150;   // real colony 5k–15k, rendered at 1:100
        this.maxFoodSources   = params.maxFoodSources   ?? 6;    // max simultaneous food patches
        this.foodSpawnInterval = params.foodSpawnInterval ?? 700;  // base ticks between new spawns
        this.foodSpawnVariance = params.foodSpawnVariance ?? 500;  // random ± added to interval
        this.minFoodAmount    = params.minFoodAmount    ?? 40;    // smallest food patch capacity
        this.maxFoodAmount    = params.maxFoodAmount    ?? 120;   // largest food patch capacity
        this.minFoodRadius    = params.minFoodRadius    ?? 9;     // px
        this.maxFoodRadius    = params.maxFoodRadius    ?? 20;    // px

        // ── State ────────────────────────────────────────────────────────────
        this.pheromones    = new Float32Array(this.gw * this.gh); // 0–255 range
        this.foodCollected = 0;
        this.tick          = 0;
        this.nextFoodSpawnTick = 0;

        this._init();
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    _init() {
        // Nest radius scaled to hold all ants without overlap:
        // hex-packing area per ant ≈ SEPARATION_DIST², so r ∝ √numAnts
        const nestRadius = Math.max(22, Math.round(Math.sqrt(this.numAnts) * 3));
        this.nest = {
            x: this.width  / 2,
            y: this.height / 2,
            radius: nestRadius,
        };

        // Start with a single food source; more will appear at random times during the sim.
        this.foodSources = [this._createRandomFoodSource()];
        // Schedule the first additional spawn after a short warm-up period.
        this.nextFoodSpawnTick = 200 + Math.floor(Math.random() * 400);
        this.ants = this._createAnts();
    }

    /** Create a food source at a random location with a random size. */
    _createRandomFoodSource() {
        const cx = this.width  / 2;
        const cy = this.height / 2;
        const angle  = Math.random() * Math.PI * 2;
        const dist   = 120 + Math.random() * 150;
        const x = Math.max(30, Math.min(this.width  - 30, cx + Math.cos(angle) * dist));
        const y = Math.max(30, Math.min(this.height - 30, cy + Math.sin(angle) * dist));
        const radius = this.minFoodRadius + Math.random() * (this.maxFoodRadius - this.minFoodRadius);
        const amount = Math.round(this.minFoodAmount + Math.random() * (this.maxFoodAmount - this.minFoodAmount));
        return { x, y, amount, maxAmount: amount, radius };
    }

    /** Possibly spawn a new food source at a random time. */
    _maybeSpawnFood() {
        if (this.tick < this.nextFoodSpawnTick) return;
        // Prune fully-depleted sources before checking the cap.
        this.foodSources = this.foodSources.filter(f => f.amount > 0);
        if (this.foodSources.length < this.maxFoodSources) {
            this.foodSources.push(this._createRandomFoodSource());
        }
        // Schedule the next spawn (always advance, even if cap prevented spawning now).
        this.nextFoodSpawnTick = this.tick
            + this.foodSpawnInterval
            + Math.floor(Math.random() * this.foodSpawnVariance);
    }

    _createAnts() {
        const { x, y, radius } = this.nest;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ≈ 137.5°
        return Array.from({ length: this.numAnts }, (_, i) => {
            // Phyllotaxis (sunflower) packing — uniformly fills the circle
            const r     = radius * Math.sqrt((i + 0.5) / this.numAnts);
            const theta = i * goldenAngle;
            const ant   = new Ant(x + r * Math.cos(theta), y + r * Math.sin(theta));
            // Point outward from centre so ants immediately disperse
            ant.angle   = theta + (Math.random() - 0.5) * 0.8;
            return ant;
        });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Advance the simulation by `steps` ticks. */
    step(steps = 1) {
        for (let s = 0; s < steps; s++) this._tickOnce();
    }

    /** Reset everything (geometry preserved). */
    reset(params = {}) {
        // Allow re-parameterisation on reset
        Object.assign(this, {
            evapRate:          params.evapRate          ?? this.evapRate,
            depositAmount:     params.depositAmount     ?? this.depositAmount,
            antSpeed:          params.antSpeed          ?? this.antSpeed,
            sensorDist:        params.sensorDist        ?? this.sensorDist,
            sensorAngle:       params.sensorAngle       ?? this.sensorAngle,
            turnSpeed:         params.turnSpeed         ?? this.turnSpeed,
            randomTurn:        params.randomTurn        ?? this.randomTurn,
            numAnts:           params.numAnts           ?? this.numAnts,
            maxFoodSources:    params.maxFoodSources    ?? this.maxFoodSources,
            foodSpawnInterval: params.foodSpawnInterval ?? this.foodSpawnInterval,
            foodSpawnVariance: params.foodSpawnVariance ?? this.foodSpawnVariance,
            minFoodAmount:     params.minFoodAmount     ?? this.minFoodAmount,
            maxFoodAmount:     params.maxFoodAmount     ?? this.maxFoodAmount,
            minFoodRadius:     params.minFoodRadius     ?? this.minFoodRadius,
            maxFoodRadius:     params.maxFoodRadius     ?? this.maxFoodRadius,
        });
        this.pheromones.fill(0);
        this.foodCollected = 0;
        this.tick          = 0;
        this._init();
    }

    /** Read-only snapshot for rendering. */
    getState() {
        return {
            ants:          this.ants,
            nest:          this.nest,
            foodSources:   this.foodSources,
            pheromones:    this.pheromones,
            gw:            this.gw,
            gh:            this.gh,
            foodCollected: this.foodCollected,
            tick:          this.tick,
        };
    }

    /**
     * Food continuously spawns, so the simulation never signals completion.
     * Always returns 0 to prevent auto-stop logic from triggering.
     */
    get progress() {
        return 0;
    }

    // ── Per-tick logic ────────────────────────────────────────────────────────

    _tickOnce() {
        this.tick++;
        this._evaporateAndDiffuse();
        this._maybeSpawnFood();
        const spatialGrid = this._buildSpatialGrid();
        for (const ant of this.ants) this._updateAnt(ant, spatialGrid);
    }

    // Build a spatial hash mapping cell keys → arrays of ants.
    // Cell size = SEPARATION_DIST so only the 3×3 neighbourhood needs checking.
    _buildSpatialGrid() {
        const grid = new Map();
        for (const ant of this.ants) {
            const cx = Math.floor(ant.x / SEPARATION_DIST);
            const cy = Math.floor(ant.y / SEPARATION_DIST);
            const key = (cx << 16) ^ cy;
            if (!grid.has(key)) grid.set(key, []);
            grid.get(key).push(ant);
        }
        return grid;
    }

    _evaporateAndDiffuse() {
        const { gw, gh, evapRate, diffuseRate, pheromones } = this;

        // Diffuse first (Gaussian-like 3×3 spread to neighbouring cells)
        if (diffuseRate > 0) {
            const tmp = new Float32Array(pheromones); // copy for stable read
            for (let y = 1; y < gh - 1; y++) {
                for (let x = 1; x < gw - 1; x++) {
                    const idx = y * gw + x;
                    const neighbourAvg = (
                        tmp[(y - 1) * gw + x    ] +
                        tmp[(y + 1) * gw + x    ] +
                        tmp[y       * gw + x - 1] +
                        tmp[y       * gw + x + 1]
                    ) * 0.25;
                    pheromones[idx] = tmp[idx] * (1 - diffuseRate) + neighbourAvg * diffuseRate;
                }
            }
        }

        // Evaporate
        for (let i = 0; i < pheromones.length; i++) {
            pheromones[i] *= (1 - evapRate);
            if (pheromones[i] < 0.002) pheromones[i] = 0;
        }
    }

    _updateAnt(ant, spatialGrid) {
        const { nest, antSpeed, turnSpeed, randomTurn, sensorDist, sensorAngle } = this;

        if (ant.state === 'SEARCHING') {
            ant.stepsSinceFood++;

            // ── Give-up: return to nest if search has gone on too long ────
            // Biologically: scouts that fail to find food return to recruit or reset.
            // Triggered at the frustration cap — the ant has already been wandering
            // randomly for a while and clearly isn't finding anything.
            const GIVE_UP_THRESHOLD = 2400;
            if (ant.stepsSinceFood >= GIVE_UP_THRESHOLD) {
                ant.state = 'RETURNING';
                // stepsSinceFood intentionally kept high so deposit weight = minimum
                // (we don't want a failed scout laying a strong trail home)
            } else {

            // Pheromone sensitivity ramps up smoothly with distance from nest.
            // A hard cutoff radius creates a ring where ants cluster at the boundary;
            // a linear ramp between nestRadius and 3× nestRadius avoids any cliff.
            const ndx = ant.x - nest.x, ndy = ant.y - nest.y;
            const distToNest = Math.sqrt(ndx * ndx + ndy * ndy);
            const rampStart  = nest.radius;
            const rampEnd    = nest.radius * 3;
            const sensitivity = Math.max(0, Math.min(1, (distToNest - rampStart) / (rampEnd - rampStart)));

            // ── Frustration escape ─────────────────────────────────────────
            // If an ant has wandered for a long time without finding food it is
            // likely looping on a pheromone trail.  Progressively suppress trail
            // following and inject random rotation so it breaks out.
            // Threshold = ~1 full diagonal of the canvas at current speed.
            const frustrationThreshold = 1200;
            const frustrationCap       = 2400;
            const frustration = Math.max(0, Math.min(1,
                (ant.stepsSinceFood - frustrationThreshold) / (frustrationCap - frustrationThreshold)
            ));
            // Effective sensitivity: reduce toward 0 as frustration rises
            const effectiveSensitivity = sensitivity * (1 - frustration);

            if (sensitivity <= 0 || frustration >= 1) {
                // Inside nest scent-shadow, or fully frustrated — pure random walk
                ant.angle += (Math.random() - 0.5) * randomTurn * (1 + frustration * 4);
            } else {
                // ── Short-range food smell (overrides trail following) ─────
                // Real Lasius niger can detect food volatiles from ~2–3 cm.
                // At 2px/mm that's ~40–60px; we use 28px as a conservative value.
                const SMELL_RANGE = 28;
                let foodSmellX = 0, foodSmellY = 0;
                for (const food of this.foodSources) {
                    if (food.amount <= 0) continue;
                    const fx = food.x - ant.x, fy = food.y - ant.y;
                    const fd2 = fx * fx + fy * fy;
                    if (fd2 < SMELL_RANGE * SMELL_RANGE && fd2 > 0) {
                        // Weight by inverse distance so closer = stronger pull
                        const inv = 1 / Math.sqrt(fd2);
                        foodSmellX += fx * inv;
                        foodSmellY += fy * inv;
                    }
                }

                if (foodSmellX !== 0 || foodSmellY !== 0) {
                    // Steer directly toward the smelled food, ignoring pheromone
                    const smellAngle = Math.atan2(foodSmellY, foodSmellX);
                    let diff = smellAngle - ant.angle;
                    while (diff >  Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    ant.angle += diff * 0.5 + (Math.random() - 0.5) * 0.1;
                } else {
                // ── Sense pheromone with 3 forward-facing sensors ──────────
                // Key insight: pheromone is deposited food→nest, so its mere
                // *presence* at a sensor means food lies in that direction away
                // from the nest.  Magnitude is irrelevant for chose direction —
                // among sensors that detect any pheromone, always prefer the one
                // pointing most away from the nest.
                const awayUX = ndx / (distToNest || 1);
                const awayUY = ndy / (distToNest || 1);

                const angleL = ant.angle - sensorAngle;
                const angleR = ant.angle + sensorAngle;

                const pheL = this._samplePheromone(ant.x, ant.y, angleL,      sensorDist);
                const pheC = this._samplePheromone(ant.x, ant.y, ant.angle,   sensorDist);
                const pheR = this._samplePheromone(ant.x, ant.y, angleR,      sensorDist);

                const PHERO_THRESHOLD = 0.5; // treat anything below this as "no trail"
                const anyPheromone = (pheL > PHERO_THRESHOLD || pheC > PHERO_THRESHOLD || pheR > PHERO_THRESHOLD)
                                     && effectiveSensitivity > 0;

                if (anyPheromone) {
                    // Dot product of each sensor direction with away-from-nest vector.
                    // Sensors with no pheromone get dot = -Infinity so they're never chosen.
                    const dotL = pheL > PHERO_THRESHOLD ? Math.cos(angleL) * awayUX + Math.sin(angleL) * awayUY : -Infinity;
                    const dotC = pheC > PHERO_THRESHOLD ? Math.cos(ant.angle) * awayUX + Math.sin(ant.angle) * awayUY : -Infinity;
                    const dotR = pheR > PHERO_THRESHOLD ? Math.cos(angleR) * awayUX + Math.sin(angleR) * awayUY : -Infinity;

                    if (dotC >= dotL && dotC >= dotR) {
                        // Centre already most outward — small random nudge to avoid lock-in
                        ant.angle += (Math.random() - 0.5) * randomTurn * (1 + frustration * 2);
                    } else if (dotL >= dotR) {
                        ant.angle -= turnSpeed * (Math.random() * 0.5 + 0.5);
                    } else {
                        ant.angle += turnSpeed * (Math.random() * 0.5 + 0.5);
                    }
                } else {
                    // No trail detected — random walk
                    ant.angle += (Math.random() - 0.5) * randomTurn * 2 * (1 + frustration);
                }
                } // end food-smell else
            }
            } // end give-up else

        } else {
            // ── RETURNING: steer toward nearest point on nest perimeter ───
            // Targeting the perimeter (not centre) causes ants to arrive spread
            // around the edge rather than all converging on one point.
            const toCentreX = nest.x - ant.x;
            const toCentreY = nest.y - ant.y;
            const distToCentre = Math.sqrt(toCentreX * toCentreX + toCentreY * toCentreY) || 1;
            // Nearest perimeter point = centre + R * unit-vector-toward-ant
            const nearX = nest.x - (toCentreX / distToCentre) * nest.radius;
            const nearY = nest.y - (toCentreY / distToCentre) * nest.radius;
            const target = Math.atan2(nearY - ant.y, nearX - ant.x);
            let diff = target - ant.angle;
            // Wrap to [-π, π]
            while (diff >  Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            ant.angle += diff * 0.18 + (Math.random() - 0.5) * 0.08;

            // ── Deposit pheromone (stop near nest; skip if gave up without food) ──
            const ndx2 = ant.x - nest.x, ndy2 = ant.y - nest.y;
            const stopRadius = nest.radius * 1.5;
            const gaveUp = ant.stepsSinceFood >= 2400;
            if (!gaveUp && ndx2 * ndx2 + ndy2 * ndy2 > stopRadius * stopRadius) {
                const bonus   = Math.max(0.1, Math.min(2, 500 / Math.max(1, ant.stepsSinceFood)));
                const deposit = this.depositAmount * bonus;
                const gx = Math.floor(ant.x / GRID_RES);
                const gy = Math.floor(ant.y / GRID_RES);
                if (gx >= 0 && gx < this.gw && gy >= 0 && gy < this.gh) {
                    this.pheromones[gy * this.gw + gx] = Math.min(255, this.pheromones[gy * this.gw + gx] + deposit);
                }
            }
        }

        // ── Separation: all ants avoid each other ────────────────────────────
        {
            const cx = Math.floor(ant.x / SEPARATION_DIST);
            const cy = Math.floor(ant.y / SEPARATION_DIST);
            let sepX = 0, sepY = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const key = ((cx + dx) << 16) ^ (cy + dy);
                    const cell = spatialGrid.get(key);
                    if (!cell) continue;
                    for (const other of cell) {
                        if (other === ant) continue;
                        const ox = ant.x - other.x;
                        const oy = ant.y - other.y;
                        const dist2 = ox * ox + oy * oy;
                        if (dist2 < SEPARATION_DIST * SEPARATION_DIST && dist2 > 0) {
                            const inv = 1 / Math.sqrt(dist2);
                            sepX += ox * inv;
                            sepY += oy * inv;
                        }
                    }
                }
            }
            if (sepX !== 0 || sepY !== 0) {
                const sepAngle = Math.atan2(sepY, sepX);
                let diff = sepAngle - ant.angle;
                while (diff >  Math.PI) diff -= 2 * Math.PI;
                while (diff < -Math.PI) diff += 2 * Math.PI;
                ant.angle += diff * 0.7;
            }
        }

        // ── Move ──────────────────────────────────────────────────────────────
        ant.x += Math.cos(ant.angle) * antSpeed;
        ant.y += Math.sin(ant.angle) * antSpeed;

        // ── Boundary: reflect off walls ───────────────────────────────────────
        if (ant.x < 0)            { ant.x = 0;            ant.angle = Math.PI - ant.angle; }
        else if (ant.x > this.width)  { ant.x = this.width;  ant.angle = Math.PI - ant.angle; }
        if (ant.y < 0)            { ant.y = 0;            ant.angle = -ant.angle; }
        else if (ant.y > this.height) { ant.y = this.height; ant.angle = -ant.angle; }

        // ── State transitions ─────────────────────────────────────────────────
        if (ant.state === 'SEARCHING') {
            for (const food of this.foodSources) {
                if (food.amount <= 0) continue;
                const dx = food.x - ant.x, dy = food.y - ant.y;
                if (dx * dx + dy * dy < food.radius * food.radius) {
                    food.amount        = Math.max(0, food.amount - 1);
                    this.foodCollected++;
                    ant.state          = 'RETURNING';
                    ant.hasFood        = true;
                    ant.angle         += Math.PI; // turn around
                    // stepsSinceFood stays — used to weight deposit on the way back
                    break;
                }
            }
        } else {
            // Check if ant reached the nest
            const dx = nest.x - ant.x, dy = nest.y - ant.y;
            if (dx * dx + dy * dy < nest.radius * nest.radius) {
                ant.state          = 'SEARCHING';
                ant.hasFood        = false;
                ant.stepsSinceFood = 0; // reset frustration on each nest visit
                // Place the ant on the nest perimeter pointing outward (± 50° spread)
                // so ants always depart rather than clumping inside the nest.
                const exitAngle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * (Math.PI * 5 / 9);
                ant.angle = exitAngle;
                ant.x     = nest.x + Math.cos(exitAngle) * (nest.radius + SEPARATION_DIST);
                ant.y     = nest.y + Math.sin(exitAngle) * (nest.radius + SEPARATION_DIST);
            }
        }
    }

    _samplePheromone(x, y, angle, dist) {
        const sx = x + Math.cos(angle) * dist;
        const sy = y + Math.sin(angle) * dist;
        const gx = Math.floor(sx / GRID_RES);
        const gy = Math.floor(sy / GRID_RES);
        if (gx < 0 || gx >= this.gw || gy < 0 || gy >= this.gh) return 0;
        return this.pheromones[gy * this.gw + gx];
    }
}
