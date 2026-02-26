import React from 'react';
import Sharer from '../sharer';
import AntColonyVisualization from '../antcolony/AntColonyVisualization';
import AntForagingVisualization from '../antcolony/AntForagingVisualization';
import { FaArrowUpRightFromSquare as FaExternalLinkAlt, FaBugs, FaCode, FaChevronDown, FaHeart } from 'react-icons/fa6';
import { SiClaude } from 'react-icons/si';
import Prism from 'prismjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../styles/prism.css';
import '../styles/blog.css';

function Eq({ tex, display = false }) {
    return (
        <span
            dangerouslySetInnerHTML={{
                __html: katex.renderToString(tex, { displayMode: display, throwOnError: false })
            }}
        />
    );
}

function CodeBlock({ label, children }) {
    const [open, setOpen] = React.useState(false);
    const highlightedRef = React.useRef(false);
    React.useEffect(() => {
        if (open && !highlightedRef.current) {
            setTimeout(() => Prism.highlightAll(), 0);
            highlightedRef.current = true;
        }
    }, [open]);
    return (
        <div style={{ margin: '20px 0 36px 0' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: open ? 'var(--surface-text-color)' : 'transparent',
                    border: '1px solid var(--surface-text-color)',
                    borderRadius: '6px',
                    color: open ? 'var(--blog-surface-background)' : 'var(--surface-text-color)',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    padding: '7px 14px',
                    cursor: 'pointer',
                    transition: 'color 0.18s, background 0.18s',
                    letterSpacing: '0.4px',
                    userSelect: 'none',
                    opacity: open ? 1 : 0.55,
                }}
            >
                <FaCode style={{ fontSize: '12px' }} />
                <span>{label}</span>
                <FaChevronDown style={{
                    fontSize: '10px',
                    marginLeft: '2px',
                    transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                }} />
            </button>
            {/* grid-template-rows trick: animates from 0fr → 1fr without knowing height */}
            <div style={{
                display: 'grid',
                gridTemplateRows: open ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.28s ease',
            }}>
                <div style={{ overflow: 'hidden', minHeight: 0 }}>
                    <div style={{ marginTop: '8px' }}>{children}</div>
                </div>
            </div>
        </div>
    );
}

export default class AntColonyOptimizationBlog extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Ant Colony Optimization | blog by Pranshu Gupta";
        setTimeout(() => Prism.highlightAll(), 0);
    }

    render() {
        return (
            <div className="blog-content">
                <div className="row bhead">
                    <FaBugs className="bigger gt1" />
                </div>
                <h1 className="title">Ant Colony Optimization</h1>
                <p>Pranshu Gupta, February 25, 2026</p>
                <Sharer className="sharer" link={window.location.href} title={"Ant Colony Optimization"}></Sharer>
                <p className="introduction">
                    Nature is known to be the best optimizer. Natural processes most often than not reach an
                    optimal equilibrium. Scientists have always strived to understand and model such processes.
                    Thus, many algorithms exist today that are inspired by nature. Many of these algorithms
                    and heuristics can be used to solve problems for which no polynomial time algorithms exist,
                    such as the travelling salesman problem and many other combinatorial optimization problems.
                    Ant Colony Optimization (ACO) is one such algorithm, inspired by the foraging behavior of
                    real ants, where simple agents collectively find efficient paths through stigmergic communication.
                </p>
                <hr style={{ backgroundColor: "white" }} />

                {/* ── Foraging Simulation ────────────────────────────── */}
                <h2 className="headings">Ant Colony Simulation</h2>
                <p>
                    Before applying ACO to a combinatorial problem, it helps to understand the biological
                    mechanism it is modelled after. The simulation below shows a colony of ants foraging
                    for food on a procedurally generated terrain. Watch how individual ants with no global
                    awareness collectively establish efficient trails between the nest and food sources purely
                    through pheromone communication.
                </p>
                <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                    <AntForagingVisualization />
                </div>
                <br></br>
                <h3 className="headings">How the Simulation Works</h3>
                <p>
                    Each ant in the simulation exists in one of two states: <b>SEARCHING</b> or <b>RETURNING</b>.
                    A searching ant wanders the terrain looking for a food source, while a returning ant heads
                    straight back to the nest after collecting food, laying pheromone along the way. This
                    asymmetry is the key insight — pheromone is only deposited on the return trip (food → nest),
                    so its very presence at any location signals that food lies further in that direction.
                </p>

                <h4 className="headings">Pheromone Mechanics</h4>
                <p>
                    The pheromone layer is stored as a flat <b>Float32Array</b> grid where each cell
                    covers a 4×4 pixel region of the canvas. On every simulation tick, two processes happen
                    simultaneously: evaporation reduces every cell's value by a constant factor, and diffusion
                    spreads a small fraction of each cell's value to its four neighbours. Evaporation ensures
                    that trails to exhausted food sources fade away, while diffusion gives the pheromone a
                    natural, blurry appearance and helps searching ants detect trails from slightly off-axis.
                </p>
                <p>
                    When a returning ant deposits pheromone, the deposit amount is inversely proportional to
                    the number of steps it took to find food — shorter paths receive more pheromone,
                    automatically reinforcing efficient routes over wandering ones. This is the core positive
                    feedback loop of ACO: better paths attract more ants, which lay more pheromone, which
                    attract even more ants.
                </p>
                <CodeBlock label="_evaporateAndDiffuse()">
                <pre><code className="language-javascript">{`_evaporateAndDiffuse() {
    const { gw, gh, evapRate, diffuseRate, pheromones } = this;

    // Diffuse: spread pheromone to 4 neighbours (stable read via copy)
    if (diffuseRate > 0) {
        const tmp = new Float32Array(pheromones);
        for (let y = 1; y < gh - 1; y++) {
            for (let x = 1; x < gw - 1; x++) {
                const idx = y * gw + x;
                const neighbourAvg = (
                    tmp[(y - 1) * gw + x] +
                    tmp[(y + 1) * gw + x] +
                    tmp[y * gw + x - 1]   +
                    tmp[y * gw + x + 1]
                ) * 0.25;
                pheromones[idx] =
                    tmp[idx] * (1 - diffuseRate) + neighbourAvg * diffuseRate;
            }
        }
    }

    // Evaporate: decay all cells by evapRate per tick
    for (let i = 0; i < pheromones.length; i++) {
        pheromones[i] *= (1 - evapRate);
        if (pheromones[i] < 0.002) pheromones[i] = 0;
    }
}`}</code></pre>
                </CodeBlock>

                <h4 className="headings">Sensing and Steering</h4>
                <p>
                    Each ant carries three forward-facing sensors: one aligned with its current heading, and
                    one angled to each side by a fixed sensor angle. On every tick, the ant samples the
                    pheromone grid at each sensor position and steers toward whichever sensor detects the
                    strongest signal. A critical detail in the implementation is that when multiple sensors
                    detect pheromone, the ant prefers the one pointing most <b>away</b> from the nest —
                    since pheromone was laid nest-bound, the food lies in the opposite direction.
                </p>
                <p>
                    Close to the nest, pheromone sensitivity is suppressed via a linear ramp so that fresh
                    ants disperse into the environment rather than immediately clustering on the nearest
                    trail segment. A short-range food smell mechanic complements the pheromone: ants within
                    a certain radius of a food source are pulled toward it directly, modelling volatile
                    chemical signals emitted by the food itself. The smell radius scales with patch size and
                    current depletion level, so a large, full patch is detectable from further away.
                </p>
                <CodeBlock label="pheromone sensor steering">
                <pre><code className="language-javascript">{`// Three forward-facing sensors: left, centre, right
const angleL = ant.angle - sensorAngle;
const angleR = ant.angle + sensorAngle;

const pheL = this._samplePheromone(ant.x, ant.y, angleL,    sensorDist);
const pheC = this._samplePheromone(ant.x, ant.y, ant.angle, sensorDist);
const pheR = this._samplePheromone(ant.x, ant.y, angleR,    sensorDist);

// Among sensors that detect pheromone, prefer the one pointing
// most away from the nest — since pheromone is laid food→nest,
// food lies in the away-from-nest direction.
const dotL = pheL > THRESHOLD ? Math.cos(angleL) * awayUX + Math.sin(angleL) * awayUY : -Infinity;
const dotC = pheC > THRESHOLD ? Math.cos(ant.angle) * awayUX + Math.sin(ant.angle) * awayUY : -Infinity;
const dotR = pheR > THRESHOLD ? Math.cos(angleR) * awayUX + Math.sin(angleR) * awayUY : -Infinity;

if (dotC >= dotL && dotC >= dotR) {
    ant.angle += (Math.random() - 0.5) * randomTurn; // centre is best: slight wobble
} else if (dotL >= dotR) {
    ant.angle -= turnSpeed * (Math.random() * 0.5 + 0.5); // turn left
} else {
    ant.angle += turnSpeed * (Math.random() * 0.5 + 0.5); // turn right
}`}</code></pre>
                </CodeBlock>

                <h4 className="headings">Lévy Flights and Exploration</h4>
                <p>
                    A purely gradient-following ant would circle existing trails forever and never discover
                    new food. To combat this, the simulation uses two mechanisms borrowed from biology.
                    First, a small Lévy-flight probability causes an ant to randomly reorient by up to ±72°
                    each tick, breaking long straight runs and redirecting the ant into unexplored territory.
                    Second, a frustration counter tracks how long a searching ant has gone without finding
                    food — as frustration builds, pheromone sensitivity is progressively suppressed and
                    random turning noise is amplified, forcing the ant out of areas where it has been
                    searching unsuccessfully.
                </p>
                <p>
                    Approximately 15% of ants are designated as <b>scouts</b>. Scouts wander three times
                    longer before giving up, use a 40% lower Lévy-flip rate (staying on course in straight
                    runs far from the nest), and deposit an exceptionally strong pheromone signal when they
                    finally return with food, recruiting many followers to a newly discovered patch.
                </p>

                <h4 className="headings">Colony Lifecycle</h4>
                <p>
                    The simulation models a living colony with births, deaths, and a food economy. Each ant
                    has a starvation timer that increments every tick it goes without collecting food; if
                    this timer exceeds a threshold, the ant dies. Ants also age and die of old age after a
                    lifespan drawn from a distribution with ±30% random variation, so the colony experiences
                    a gradual turnover rather than a sudden die-off. The queen periodically spawns new ants
                    at the nest edge, but if no food has been delivered to the nest store for too long, the
                    queen starves and the colony collapses — no more births.
                </p>
                <p>
                    The terrain itself is generated procedurally using four octaves of overlapping sine waves
                    at different scales and orientations, producing an organic heightmap. Cells below a water
                    level threshold become impassable water. The nest is always placed at the highest
                    elevation on the map, and food sources are constrained to spawn on dry land away from
                    the nest. You can click anywhere on the canvas to manually plant a food source.
                </p>
                <hr style={{ backgroundColor: "white" }} />
                <br></br>
                {/* ── TSP Solver ─────────────────────────────────────── */}
                <h2 className="headings">Travelling Salesman Problem</h2>
                <p>
                    The Travelling Salesman Problem (TSP) asks: given a list of cities and the distances
                    between them, what is the shortest route that visits every city exactly once and returns
                    to the starting city? TSP is NP-hard — no known polynomial time algorithm exists for
                    finding the optimal solution in the general case. ACO is one of the most effective and
                    well-studied metaheuristics for approximating TSP solutions. The interactive visualizer
                    below runs ACO on a randomly generated set of cities in real time.
                </p>
                <div style={{ marginTop: '30px', marginBottom: '30px' }}>
                    <AntColonyVisualization />
                </div>

                <h3 className="headings">The ACO Algorithm for TSP</h3>
                <p>
                    The algorithm maintains a pheromone matrix <b>τ</b> of size N×N where N is the number
                    of cities, and τ[i][j] represents the pheromone level on the edge between city i and
                    city j. It also uses a heuristic matrix <b>η</b> where η[i][j] = 1 / d(i, j), the
                    inverse of the Euclidean distance — shorter edges are inherently more attractive.
                    Pheromones are initialised to a small uniform value derived from the average edge length
                    so that the initial bias is as neutral as possible.
                </p>

                <h4 className="headings">Path Construction</h4>
                <p>
                    On each iteration, every ant constructs a complete tour of all cities starting from
                    city 0. At each step, the ant is at some city <i>i</i> and must choose the next unvisited
                    city <i>j</i>. The probability of choosing city <i>j</i> is given by:
                </p>
                <blockquote>
                    <p style={{ textAlign: 'center', margin: '18px 0' }}>
                        <Eq display={true} tex={String.raw`P(i \to j) = \frac{[\tau(i,j)]^{\alpha} \cdot [\eta(i,j)]^{\beta}}{\displaystyle\sum_{k \notin \text{visited}} [\tau(i,k)]^{\alpha} \cdot [\eta(i,k)]^{\beta}}`} />
                    </p>
                    <p>
                        where the sum in the denominator runs over all unvisited cities <i>k</i>, <b>α</b> controls
                        how strongly the ant favours high-pheromone edges, and <b>β</b> controls how strongly
                        it favours short edges. Both are tunable parameters in the visualizer above.
                    </p>
                </blockquote>
                <p>
                    The next city is selected using <b>roulette wheel selection</b>: a random number is
                    drawn uniformly in [0, Σ], and the cumulative sum of probabilities is scanned until
                    the threshold is crossed. This stochastic selection means ants explore different tours
                    each iteration even with identical pheromone levels, which is essential for avoiding
                    premature convergence on a locally optimal but globally suboptimal tour.
                </p>
                <CodeBlock label="selectNextCity()">
                <pre><code className="language-javascript">{`selectNextCity(current, visited) {
    const probabilities = [];
    let sum = 0;

    for (let j = 0; j < this.numCities; j++) {
        if (visited.has(j)) {
            probabilities.push(0);
        } else {
            // P(i→j) ∝ τ[i][j]^α · η[i][j]^β
            const pheromone = Math.pow(this.pheromones[current][j], this.alpha);
            const heuristic = Math.pow(1 / this.distances[current][j], this.beta);
            const probability = pheromone * heuristic;
            probabilities.push(probability);
            sum += probability;
        }
    }

    // Roulette wheel selection: draw r ∈ [0, Σ] and scan cumulative sum
    const r = Math.random() * sum;
    let cumulative = 0;
    for (let j = 0; j < this.numCities; j++) {
        cumulative += probabilities[j];
        if (r <= cumulative) return j;
    }
    return probabilities.indexOf(Math.max(...probabilities));
}`}</code></pre>
                </CodeBlock>

                <h4 className="headings">Pheromone Update</h4>
                <p>
                    After all ants have completed their tours, two updates are applied to the pheromone
                    matrix. First, every entry is multiplied by (1 − ρ) where ρ is the evaporation rate,
                    simulating the natural dissipation of pheromone over time and allowing the colony to
                    "forget" poor solutions. Second, each ant deposits pheromone proportional to the quality
                    of its tour: for a tour of total length L, an amount Q/L is added to every edge in
                    the tour. Shorter tours therefore receive more pheromone, making them more attractive
                    to future ants. The update is symmetric — pheromone is added to both τ[i][j] and τ[j][i].
                </p>
                <CodeBlock label="updatePheromones()">
                <pre><code className="language-javascript">{`updatePheromones(ants) {
    // Evaporation: every edge loses a fraction of its pheromone each iteration
    for (let i = 0; i < this.numCities; i++) {
        for (let j = 0; j < this.numCities; j++) {
            this.pheromones[i][j] *= (1 - this.evaporationRate);
        }
    }

    // Deposition: each ant reinforces the edges it used, weighted by tour quality
    // Shorter tour → larger delta → stronger reinforcement
    for (const ant of ants) {
        const delta = this.q / ant.cost;
        for (let i = 0; i < ant.path.length; i++) {
            const from = ant.path[i];
            const to   = ant.path[(i + 1) % ant.path.length];
            this.pheromones[from][to] += delta;
            this.pheromones[to][from] += delta; // symmetric matrix
        }
    }
}`}</code></pre>
                </CodeBlock>

                <h4 className="headings">Convergence</h4>
                <p>
                    Over many iterations, the pheromone on good edges accumulates faster than it evaporates,
                    while the pheromone on poor edges fades away. The colony's collective behaviour shifts
                    from broad exploration in early iterations to concentrated exploitation of the best-known
                    tour in later ones. The best tour found across all ants and all iterations is tracked
                    and displayed in the visualizer at the end of each run. You can observe this convergence
                    by watching how scattered the ant trails are early on compared to how tightly they
                    cluster around the final best path.
                </p>
                <p>
                    The quality of the solution depends on the balance between the parameters. A high α
                    relative to β causes the colony to over-exploit pheromone trails and converge quickly
                    but to a potentially poor solution. A high β relative to α makes ants behave more like
                    a greedy nearest-neighbour heuristic, ignoring accumulated collective knowledge. The
                    default values of α = 1 and β = 2 reflect the widely reported empirical sweet spot for
                    ACO on TSP instances.
                </p>

                <hr style={{ backgroundColor: "white" }} />
                <br />
                <h2 className="headings">References</h2>
                <ol>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/585892">Dorigo, M., &amp; Gambardella, L. M. (1997). Ant colony system: A cooperative learning approach to the traveling salesman problem. <i>IEEE Transactions on Evolutionary Computation, 1(1)</i>, 53–66.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://ieeexplore.ieee.org/document/1597059">Dorigo, M., Birattari, M., &amp; Stutzle, T. (2006). Ant colony optimization — artificial ants as a computational intelligence technique. <i>IEEE Computational Intelligence Magazine, 1(4)</i>, 28–39.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://global.oup.com/academic/product/swarm-intelligence-9780195136746">Bonabeau, E., Dorigo, M., &amp; Theraulaz, G. (1999). <i>Swarm Intelligence: From Natural to Artificial Systems</i>. Oxford University Press.</a></li>
                    <li><a target="_blank" rel="noopener noreferrer" href="https://arxiv.org/abs/1903.01893">Gupta, P. (2019). Algorithms inspired by nature: A survey. <i>arXiv:1903.01893 [cs.NE]</i>.</a></li>
                </ol>
                <hr style={{ backgroundColor: "white" }} />
                <p style={{ textAlign: 'center', opacity: 0.45, fontSize: '13px', letterSpacing: '0.5px', marginTop: '8px' }}>
                    written with <FaHeart style={{ color: '#e05', verticalAlign: 'middle', fontSize: '11px', margin: '0 2px' }} /> and <SiClaude style={{ verticalAlign: 'middle', fontSize: '13px', margin: '0 3px 0 2px', color: '#D97757' }} /> claude sonnet
                </p>
            </div>
        );
    }
}
