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
    constructor(x, y, lifespan = 0) {
        this.x = x;
        this.y = y;
        this.angle = Math.random() * Math.PI * 2;
        this.state   = 'SEARCHING'; // 'SEARCHING' | 'RETURNING'
        this.hasFood = false;         // true only when carrying collected food
        // Accumulated steps while searching — used to weight pheromone deposit.
        // Fewer steps → shorter path → more pheromone (like 1/L in classic ACO).
        this.stepsSinceFood = 0;
        // Starvation counter — resets only when food is actually collected.
        // Unlike stepsSinceFood this is NOT reset at the nest.
        this.starvationTimer = 0;
        // Age: how many ticks this ant has lived.  Compared against `lifespan`.
        this.age      = 0;
        this.lifespan = lifespan; // set by simulation at spawn time
        this.dead     = false;
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
        this.turnSpeed      = params.turnSpeed      ?? 0.35;   // radians of max steer per tick
        this.randomTurn     = params.randomTurn     ?? 0.12;   // per-step noise — kept small so Lévy runs stay straight
        // Base exploration probability — decays exponentially with trail strength so
        // strong trails are nearly always exploited while faint ones are freely explored.
        this.explorationRate = params.explorationRate ?? 0.25;
        // Lévy-flight reorientation: probability per tick of a large random heading change.
        // Small value keeps runs long (high persistence) while still preventing ants from
        // marching off the canvas indefinitely.
        this.levyRate       = params.levyRate       ?? 0.012;
        this.numAnts          = params.numAnts          ?? 150;   // real colony 5k–15k, rendered at 1:100
        this.maxFoodSources   = params.maxFoodSources   ?? 6;    // max simultaneous food patches
        this.foodSpawnInterval = params.foodSpawnInterval ?? 700;  // base ticks between new spawns
        this.foodSpawnVariance = params.foodSpawnVariance ?? 500;  // random ± added to interval
        this.minFoodAmount    = params.minFoodAmount    ?? 40;    // smallest food patch capacity
        this.maxFoodAmount    = params.maxFoodAmount    ?? 120;   // largest food patch capacity
        this.minFoodRadius    = params.minFoodRadius    ?? 9;     // px
        this.maxFoodRadius    = params.maxFoodRadius    ?? 20;    // px
        this.waterLevel       = params.waterLevel       ?? 0.22;  // elevation threshold — cells below are water
        this.slopeEffect      = params.slopeEffect      ?? 0.55;  // 0=flat, 1=strong terrain influence
        this.deathThreshold         = params.deathThreshold         ?? 10000; // starvation ticks before an ant dies
        this.maxAge                  = params.maxAge                  ?? 20000; // ticks — ±30 % jitter applied per-ant
        this.antBirthInterval        = params.antBirthInterval        ?? 150;   // ticks between new ants born at nest
        this.queenStarvationThreshold = params.queenStarvationThreshold ?? 15000; // delivery drought that kills the queen
        // Nest food store: foragers deposit here; trophallaxis and passive metabolism draw from here.
        // Colony consumption rate ≈ 0.003 units/ant/tick — matched so a single active forager
        // can sustain ~30 ants; a full colony of 150 needs ~10+ foragers delivering regularly.
        this.nestFoodConsumptionRate = params.nestFoodConsumptionRate ?? 0.003;
        this.nestFoodStoreMax        = params.nestFoodStoreMax        ?? 500;

        // ── State ────────────────────────────────────────────────────────────
        this.pheromones    = new Float32Array(this.gw * this.gh); // 0–255 range
        this.foodCollected    = 0;
        this.antsDied         = 0;
        this.nestFoodStore    = 50;  // small starting buffer so the colony isn't starving from tick 1
        this.queenHungerTimer = 0;  // ticks since last food was delivered to the nest
        this.queenDead        = false;
        this.tick             = 0;
        this.nextFoodSpawnTick = 0;
        this.nextBirthTick     = 0;

        this._init();
    }

    // ── Initialisation ────────────────────────────────────────────────────────

    _init() {
        // Nest radius scaled to hold all ants without overlap:
        // hex-packing area per ant ≈ SEPARATION_DIST², so r ∝ √numAnts
        const nestRadius = Math.max(22, Math.round(Math.sqrt(this.numAnts) * 3));

        // Generate raw heightmap first so we can pick the best (highest) nest site.
        const rawMap = this._generateRawHeightmap();

        // Find the highest grid cell, keeping a margin away from canvas edges.
        const marginCells = Math.ceil(60 / GRID_RES);
        let bestVal = -Infinity, peakGX = Math.floor(this.gw / 2), peakGY = Math.floor(this.gh / 2);
        for (let gy = marginCells; gy < this.gh - marginCells; gy++) {
            for (let gx = marginCells; gx < this.gw - marginCells; gx++) {
                const v = rawMap[gy * this.gw + gx];
                if (v > bestVal) { bestVal = v; peakGX = gx; peakGY = gy; }
            }
        }

        this.nest = {
            x: peakGX * GRID_RES + GRID_RES / 2,
            y: peakGY * GRID_RES + GRID_RES / 2,
            radius: nestRadius,
            shapeRadii: this._randomBlobRadii(11, 0.18),
        };

        // Blend the nest area to guaranteed dry land and store the finished map.
        this.heightmap = this._applyNestBlend(rawMap);
        // Start with a single food source; more will appear at random times during the sim.
        this.foodSources = [this._createRandomFoodSource()];
        // Schedule the first additional spawn after a short warm-up period.
        this.nextFoodSpawnTick = 200 + Math.floor(Math.random() * 400);
        this.ants = this._createAnts();
    }

    /**
     * Generate a raw elevation heightmap using overlapping sine waves.
     * Values are normalised to 0–1. No nest blending is applied here;
     * call _applyNestBlend() separately once the nest position is known.
     */
    _generateRawHeightmap() {
        const { gw, gh } = this;
        const h = new Float32Array(gw * gh);

        // Multiple octaves at different scales and orientations → organic hills
        const waves = [
            { scale: 0.008, angle: 0.30, amp: 1.000 },
            { scale: 0.015, angle: 1.10, amp: 0.500 },
            { scale: 0.025, angle: 2.40, amp: 0.250 },
            { scale: 0.042, angle: 0.80, amp: 0.125 },
        ];
        const phases = waves.map(() => Math.random() * Math.PI * 2);

        let minH = Infinity, maxH = -Infinity;
        for (let gy = 0; gy < gh; gy++) {
            for (let gx = 0; gx < gw; gx++) {
                const px = gx * GRID_RES, py = gy * GRID_RES;
                let val = 0;
                for (let i = 0; i < waves.length; i++) {
                    const w = waves[i];
                    val += Math.sin(w.scale * (px * Math.cos(w.angle) + py * Math.sin(w.angle)) + phases[i]) * w.amp;
                }
                h[gy * gw + gx] = val;
                if (val < minH) minH = val;
                if (val > maxH) maxH = val;
            }
        }
        // Normalise to 0–1
        const range = maxH - minH || 1;
        for (let i = 0; i < h.length; i++) h[i] = (h[i] - minH) / range;
        return h;
    }

    /**
     * Blend the nest area of an existing heightmap toward a guaranteed dry-land
     * floor.  Since the nest is always at the terrain peak, the blend mostly
     * just smooths the immediate surroundings rather than lifting the height.
     */
    _applyNestBlend(h) {
        const { gw, gh } = this;
        const nestGX   = this.nest.x / GRID_RES;
        const nestGY   = this.nest.y / GRID_RES;
        const flatR    = (this.nest.radius + 50) / GRID_RES;
        const dryFloor = this.waterLevel + 0.15; // guaranteed dry land at the nest
        for (let gy = 0; gy < gh; gy++) {
            for (let gx = 0; gx < gw; gx++) {
                const dx = gx - nestGX, dy = gy - nestGY;
                const t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / flatR);
                // Ensure floor, but never lower the terrain (nest is already high)
                const blended = h[gy * gw + gx] * (1 - t * t) + dryFloor * (t * t);
                h[gy * gw + gx] = Math.max(h[gy * gw + gx], blended);
            }
        }
        return h;
    }

    // Water is now defined by the waterLevel threshold on the heightmap alone.
    // No discrete puddle circles or depression are needed.

    /**
     * Generate N radius multipliers for an organic blob shape.
     * Each multiplier is in [1-spread, 1+spread], with a smooth low-frequency
     * variation so adjacent points don't jitter wildly.
     */
    _randomBlobRadii(n, spread) {
        // Generate raw random offsets, then smooth them with a simple circular
        // moving average so the blob has gentle undulations instead of spikes.
        const raw = Array.from({ length: n }, () => (Math.random() - 0.5) * 2 * spread);
        return raw.map((_, i) => {
            const prev = raw[(i - 1 + n) % n];
            const next = raw[(i + 1)     % n];
            return 1 + (prev * 0.25 + raw[i] * 0.5 + next * 0.25);
        });
    }

    /** Sample the heightmap at pixel coordinates. */
    _sampleHeight(x, y) {
        const gx = Math.floor(x / GRID_RES);
        const gy = Math.floor(y / GRID_RES);
        if (gx < 0 || gx >= this.gw || gy < 0 || gy >= this.gh) return 0;
        return this.heightmap[gy * this.gw + gx];
    }

    /** Create a food source at a random location with a random size. */
    _createRandomFoodSource() {
        const cx = this.nest.x;
        const cy = this.nest.y;
        const radius = this.minFoodRadius + Math.random() * (this.maxFoodRadius - this.minFoodRadius);
        const amount = Math.round(this.minFoodAmount + Math.random() * (this.maxFoodAmount - this.minFoodAmount));
        // Retry with fully random positions across the whole canvas.
        // Enforce a minimum clearance from the nest so food isn't spawned on top of it.
        const nestClearance = this.nest.radius + 40;
        for (let t = 0; t < 80; t++) {
            const x = 30 + Math.random() * (this.width  - 60);
            const y = 30 + Math.random() * (this.height - 60);
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy < nestClearance * nestClearance) continue;
            if (this._sampleHeight(x, y) >= this.waterLevel) {
                return { x, y, amount, maxAmount: amount, radius, shapeRadii: this._randomBlobRadii(9, 0.30) };
            }
        }
        // Fallback: scan a coarse grid and pick any dry cell outside nest clearance
        const step = 30;
        for (let fy = step; fy < this.height - step; fy += step) {
            for (let fx = step; fx < this.width - step; fx += step) {
                if (this._sampleHeight(fx, fy) < this.waterLevel) continue;
                const dx = fx - cx, dy = fy - cy;
                if (dx * dx + dy * dy < nestClearance * nestClearance) continue;
                return { x: fx, y: fy, amount, maxAmount: amount, radius, shapeRadii: this._randomBlobRadii(9, 0.30) };
            }
        }
        return { x: cx + nestClearance, y: cy, amount, maxAmount: amount, radius, shapeRadii: this._randomBlobRadii(9, 0.30) };
    }

    /** Return a lifespan with ±30 % random variation so ants die gradually. */
    _randomLifespan() {
        return Math.round(this.maxAge * (0.70 + Math.random() * 0.60));
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
            const ant   = new Ant(x + r * Math.cos(theta), y + r * Math.sin(theta), this._randomLifespan());
            // Stagger initial ages across the full lifespan so the first wave
            // doesn't die all at once — simulates a pre-existing workforce.
            ant.age   = Math.floor(Math.random() * ant.lifespan * 0.6);
            // Point outward from centre so ants immediately disperse
            ant.angle = theta + (Math.random() - 0.5) * 0.8;
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
            explorationRate:   params.explorationRate   ?? this.explorationRate,
            levyRate:          params.levyRate          ?? this.levyRate,
            numAnts:           params.numAnts           ?? this.numAnts,
            maxFoodSources:    params.maxFoodSources    ?? this.maxFoodSources,
            foodSpawnInterval: params.foodSpawnInterval ?? this.foodSpawnInterval,
            foodSpawnVariance: params.foodSpawnVariance ?? this.foodSpawnVariance,
            minFoodAmount:     params.minFoodAmount     ?? this.minFoodAmount,
            maxFoodAmount:     params.maxFoodAmount     ?? this.maxFoodAmount,
            minFoodRadius:     params.minFoodRadius     ?? this.minFoodRadius,
            maxFoodRadius:     params.maxFoodRadius     ?? this.maxFoodRadius,
            waterLevel:        params.waterLevel        ?? this.waterLevel,
            slopeEffect:       params.slopeEffect       ?? this.slopeEffect,
            nestFoodConsumptionRate: params.nestFoodConsumptionRate ?? this.nestFoodConsumptionRate,
            nestFoodStoreMax:        params.nestFoodStoreMax        ?? this.nestFoodStoreMax,
        });
        this.pheromones.fill(0);
        this.foodCollected    = 0;
        this.antsDied         = 0;
        this.nestFoodStore    = 50;
        this.queenHungerTimer = 0;
        this.queenDead        = false;
        this.tick             = 0;
        this._init();
    }

    /** Read-only snapshot for rendering. */
    getState() {
        return {
            ants:          this.ants,
            nest:          this.nest,
            foodSources:   this.foodSources,
            waterLevel:    this.waterLevel,
            pheromones:    this.pheromones,
            heightmap:     this.heightmap,
            gw:            this.gw,
            gh:            this.gh,
            foodCollected:    this.foodCollected,
            antsDied:         this.antsDied,
            nestFoodStore:    this.nestFoodStore,
            nestFoodStoreMax: this.nestFoodStoreMax,
            queenDead:        this.queenDead,
            queenHungerTimer: this.queenHungerTimer,
            queenStarvationThreshold: this.queenStarvationThreshold,
            tick:             this.tick,
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

        // Passive colony metabolism: each ant consumes from the nest food store each tick.
        // Models background energy use (heating, queen feeding, larval care).
        this.nestFoodStore = Math.max(0,
            this.nestFoodStore - this.ants.length * this.nestFoodConsumptionRate
        );
        const spatialGrid = this._buildSpatialGrid();
        for (const ant of this.ants) this._updateAnt(ant, spatialGrid);

        // Remove dead ants
        const before = this.ants.length;
        this.ants = this.ants.filter(a => !a.dead);
        this.antsDied += before - this.ants.length;

        // Queen hunger: count every tick; reset when food is delivered (see _updateAnt)
        if (!this.queenDead) {
            this.queenHungerTimer++;
            if (this.queenHungerTimer >= this.queenStarvationThreshold) {
                this.queenDead = true; // colony collapses — no more births
            }
        }

        // Slowly replenish from the nest (queen keeps laying eggs, unless she has died)
        if (!this.queenDead && this.tick >= this.nextBirthTick && this.ants.length < this.numAnts) {
            const { x, y, radius } = this.nest;
            const exitAngle = Math.random() * Math.PI * 2;
            const newAnt    = new Ant(
                x + Math.cos(exitAngle) * (radius + SEPARATION_DIST),
                y + Math.sin(exitAngle) * (radius + SEPARATION_DIST)
            );
            newAnt.angle = exitAngle;
            newAnt.lifespan = this._randomLifespan();
            this.ants.push(newAnt);
            this.nextBirthTick = this.tick + this.antBirthInterval;
        }
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

        // Starvation check — ant dies if it hasn't eaten in too long
        if (!ant.hasFood) ant.starvationTimer++;
        if (ant.starvationTimer >= this.deathThreshold) {
            ant.dead = true;
            return;
        }

        // Age check — ant dies of old age
        ant.age++;
        if (ant.age >= ant.lifespan) {
            ant.dead = true;
            return;
        }

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
            const rampEnd    = nest.radius * 5; // extended so ants travel further before trails can capture them
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

            // Lévy-flight reorientation: occasionally take a moderate random turn,
            // breaking the current run and starting a new direction.
            // Arc capped at ±72° so the heading change is visible but not a violent reversal.
            if (Math.random() < this.levyRate) {
                ant.angle += (Math.random() - 0.5) * Math.PI * 0.8;
            }

            if (sensitivity <= 0 || frustration >= 1) {
                // Inside nest scent-shadow, or fully frustrated — pure random walk
                ant.angle += (Math.random() - 0.5) * randomTurn * (1 + frustration * 1.5);
            } else {
                // ── Short-range food smell (overrides trail following) ─────
                // Smell range scales with patch size: larger/fuller patches emit
                // stronger volatiles and can be detected from further away.
                // Formula: BASE + food.radius × 1.4 × (amount / maxAmount)
                //   small full patch  (~9 px): 14 + 13  = ~27 px
                //   large full patch (~20 px): 14 + 28  = ~42 px
                //   depleting patch           : decays toward BASE (14 px)
                const SMELL_BASE = 28;
                let foodSmellX = 0, foodSmellY = 0;
                for (const food of this.foodSources) {
                    if (food.amount <= 0) continue;
                    const depletion  = food.amount / food.maxAmount;
                    const smellRange = SMELL_BASE + food.radius * 1.4 * depletion;
                    const fx = food.x - ant.x, fy = food.y - ant.y;
                    const fd2 = fx * fx + fy * fy;
                    if (fd2 < smellRange * smellRange && fd2 > 0) {
                        // Weight by inverse distance so closer = stronger pull,
                        // further scaled by depletion so a half-empty patch pulls less
                        const inv = depletion / Math.sqrt(fd2);
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
                    ant.angle += diff * 0.18 + (Math.random() - 0.5) * 0.06;
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

                const PHERO_THRESHOLD = 1.5; // treat anything below this as "no trail"
                // Strength-adaptive exploration: P(explore) falls off exponentially as
                // trail strength rises.  At max pheromone (~255) it's ≈0; at threshold
                // it's ≈ explorationRate.  This preserves exploitation on proven routes
                // while keeping scouts genuinely free to roam on faint/new trails.
                const maxPhe = Math.max(pheL, pheC, pheR);
                const exploring = Math.random() < this.explorationRate * Math.exp(-maxPhe / 30);
                const anyPheromone = !exploring
                                     && (pheL > PHERO_THRESHOLD || pheC > PHERO_THRESHOLD || pheR > PHERO_THRESHOLD)
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

        // ── Terrain: slope-based speed modifier + contour-following nudge ─────
        const SLOPE_LOOKAHEAD = 6; // px ahead to sample for gradient
        const hHere  = this._sampleHeight(ant.x, ant.y);
        const hAhead = this._sampleHeight(
            ant.x + Math.cos(ant.angle) * SLOPE_LOOKAHEAD,
            ant.y + Math.sin(ant.angle) * SLOPE_LOOKAHEAD
        );
        const slope = hAhead - hHere; // positive = going uphill
        // Uphill slows, downhill speeds; clamped to keep things fun
        const slopeScale = Math.max(0.35, Math.min(1.5, 1 - slope * this.slopeEffect * 10));
        const effectiveSpeed = antSpeed * slopeScale;

        // Gentle contour-following: sample left/right at 45° — steer slightly
        // toward the lower neighbour so ants prefer ridgelines and valleys.
        // Clamp to waterLevel so ants are never nudged toward water.
        const hLeft  = Math.max(this.waterLevel, this._sampleHeight(
            ant.x + Math.cos(ant.angle - Math.PI / 4) * SLOPE_LOOKAHEAD,
            ant.y + Math.sin(ant.angle - Math.PI / 4) * SLOPE_LOOKAHEAD
        ));
        const hRight = Math.max(this.waterLevel, this._sampleHeight(
            ant.x + Math.cos(ant.angle + Math.PI / 4) * SLOPE_LOOKAHEAD,
            ant.y + Math.sin(ant.angle + Math.PI / 4) * SLOPE_LOOKAHEAD
        ));
        const lateralDiff = hRight - hLeft; // +ve → right is higher → nudge left
        ant.angle += lateralDiff * this.slopeEffect * 0.25;

        // ── Pre-emptive water avoidance: steer away before hitting the edge ──
        // Sample a bit further ahead; if water is approaching, bias toward the
        // uphill (shore-away) direction so ants curve around puddles smoothly.
        // Skip when heading toward the nest so returning ants are never diverted.
        const _dxNest = nest.x - ant.x, _dyNest = nest.y - ant.y;
        const _distNest = Math.sqrt(_dxNest * _dxNest + _dyNest * _dyNest);
        const _nearNest = _distNest < nest.radius * 2.5;
        {
            const WL = 14; // lookahead px
            const hFwd = this._sampleHeight(
                ant.x + Math.cos(ant.angle) * WL,
                ant.y + Math.sin(ant.angle) * WL
            );
            if (!_nearNest && hFwd < this.waterLevel + 0.04) {
                const SW = GRID_RES * 3;
                const gwX = this._sampleHeight(ant.x + SW, ant.y) - this._sampleHeight(ant.x - SW, ant.y);
                const gwY = this._sampleHeight(ant.x, ant.y + SW) - this._sampleHeight(ant.x, ant.y - SW);
                const gwLen = Math.sqrt(gwX * gwX + gwY * gwY);
                if (gwLen > 0.001) {
                    const avoidAngle = Math.atan2(gwY, gwX); // uphill = away from water
                    let dA = avoidAngle - ant.angle;
                    while (dA >  Math.PI) dA -= 2 * Math.PI;
                    while (dA < -Math.PI) dA += 2 * Math.PI;
                    ant.angle += dA * 0.4;
                }
            }
        }

        // ── Move (with water-terrain collision) ──────────────────────────────
        const newX = ant.x + Math.cos(ant.angle) * effectiveSpeed;
        const newY = ant.y + Math.sin(ant.angle) * effectiveSpeed;

        // Check if destination is inside (or on the edge of) the nest.
        // The nest area is always dry land, so allow the move unconditionally.
        const _dxNew = newX - nest.x, _dyNew = newY - nest.y;
        const _destInNest = _dxNew * _dxNew + _dyNew * _dyNew < nest.radius * nest.radius;

        if (!_destInNest && this._sampleHeight(newX, newY) < this.waterLevel) {
            // Compute terrain gradient with a wider sample for reliable shore normals.
            const S = GRID_RES * 3;
            const gxGrad = this._sampleHeight(ant.x + S, ant.y) - this._sampleHeight(ant.x - S, ant.y);
            const gyGrad = this._sampleHeight(ant.x, ant.y + S) - this._sampleHeight(ant.x, ant.y - S);
            const gLen   = Math.sqrt(gxGrad * gxGrad + gyGrad * gyGrad);

            let moved = false;
            if (gLen > 0.001) {
                // Shore tangent — two candidate directions (±90° from uphill normal)
                const tanA = Math.atan2(gxGrad, -gyGrad);
                const tanB = tanA + Math.PI;
                // Pick the tangent closer to the current heading so ants slide
                // naturally around the puddle rather than reversing abruptly.
                const dA = Math.abs(Math.atan2(Math.sin(tanA - ant.angle), Math.cos(tanA - ant.angle)));
                const dB = Math.abs(Math.atan2(Math.sin(tanB - ant.angle), Math.cos(tanB - ant.angle)));
                const slideAngle = dA <= dB ? tanA : tanB;
                const sx = ant.x + Math.cos(slideAngle) * effectiveSpeed;
                const sy = ant.y + Math.sin(slideAngle) * effectiveSpeed;
                if (this._sampleHeight(sx, sy) >= this.waterLevel) {
                    ant.x     = sx;
                    ant.y     = sy;
                    ant.angle = slideAngle + (Math.random() - 0.5) * 0.25;
                    moved     = true;
                }
            }

            if (!moved) {
                // Last resort: turn directly uphill (away from water centre)
                if (gLen > 0.001) {
                    ant.angle = Math.atan2(gyGrad, gxGrad) + (Math.random() - 0.5) * 0.5;
                } else {
                    ant.angle += Math.PI + (Math.random() - 0.5) * 0.5;
                }
            }
        } else {
            ant.x = newX;
            ant.y = newY;
        }

        // ── Boundary: reflect off walls ───────────────────────────────────────
        if (ant.x < 0)            { ant.x = 0;            ant.angle = Math.PI - ant.angle; }
        else if (ant.x > this.width)  { ant.x = this.width;  ant.angle = Math.PI - ant.angle; }
        if (ant.y < 0)            { ant.y = 0;            ant.angle = -ant.angle; }
        else if (ant.y > this.height) { ant.y = this.height; ant.angle = -ant.angle; }

        // ── State transitions ─────────────────────────────────────────────────
        // Searching ants pick up food; gave-up returning ants also grab food
        // opportunistically — it would be wrong for an ant to walk through food
        // and ignore it just because it had already decided to head home.
        if (ant.state === 'SEARCHING' || (ant.state === 'RETURNING' && !ant.hasFood)) {
            for (const food of this.foodSources) {
                if (food.amount <= 0) continue;
                const dx = food.x - ant.x, dy = food.y - ant.y;
                if (dx * dx + dy * dy < food.radius * food.radius) {
                    food.amount        = Math.max(0, food.amount - 1);
                    this.foodCollected++;
                    ant.state          = 'RETURNING';
                    ant.hasFood        = true;
                    ant.starvationTimer = 0; // fed — reset starvation clock
                    // stepsSinceFood intentionally kept: encodes path length for deposit weighting
                    // (gave-up ants will have a high value → low bonus, which is correct)
                    ant.angle         += Math.PI; // turn around
                    break;
                }
            }
        }
        if (ant.state === 'RETURNING') {
            // Check if ant reached the nest
            const dx = nest.x - ant.x, dy = nest.y - ant.y;
            if (dx * dx + dy * dy < nest.radius * nest.radius) {
                // If the ant was carrying food, deposit it into the nest store and reset queen drought timer.
                if (ant.hasFood) {
                    this.queenHungerTimer = 0;
                    this.nestFoodStore = Math.min(this.nestFoodStoreMax, this.nestFoodStore + 1);
                }
                // Trophallaxis: nestmates share stored food with the returning ant.
                // Only resets starvation if the store actually has food to give.
                if (this.nestFoodStore > 0) {
                    ant.starvationTimer = 0;
                }
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
