import React from 'react';
import Sharer from "../sharer";
import RenjuGame from '../renju/RenjuGame';

import "../styles/prism.css";
import '../styles/fonts.css';
import '../styles/blog.css';
import '../styles/renju-architecture.css';

import tensorConvSvg from './renju/tensor-convolution.svg?raw';
import residualTowerOverviewSvg from './renju/residual-tower-overview.svg?raw';
import residualBlockSvg from './renju/residual-block.svg?raw';
import policyValueHeadsSvg from './renju/policy-value-heads.svg?raw';
import minimaxBackupSvg from './renju/minimax-backup.svg?raw';
import alphaBetaPruningSvg from './renju/alpha-beta-pruning.svg?raw';
import TrainingCurve from './renju/TrainingCurve';

import { FaGamepad, FaBrain, FaReact, FaGears, FaBolt, FaNetworkWired } from 'react-icons/fa6';

function MermaidFigure({ svg, label, caption }) {
    return (
        <figure className="renju-mermaid-figure">
            <div
                className="mermaid-diagram renju-mermaid-diagram"
                aria-label={label}
                dangerouslySetInnerHTML={{ __html: svg }}
            />
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}

export default class Renju extends React.Component {
    componentDidMount() {
        window.scrollTo(0, 0);
        document.title = "Renju - A Strategic Board Game with AI | blog by Pranshu Gupta";
    }

    render() {
        return (
            <div className="language-javascript">
                <div className="row bhead">
                    <FaGamepad className="bigger gt1" />
                </div>
                <h1 className="title">Renju - A Strategic Board Game with AI</h1>
                <p>Pranshu Gupta, {this.props.date}</p>
                <Sharer link={window.location.href} title={"Renju - A Strategic Board Game with AI"}></Sharer>

                <p className="introduction">
                    Renju looks simple — place stones, get five in a row — but beneath that simplicity lies a game strategically rich enough that mathematicians proved perfect Black play always wins without special restrictions. This project trains a neural network to play it: six phases spanning supervised learning, reinforcement learning against a minimax engine, specialist training by color, human fine-tuning, and a live browser gym. The result runs fully in-browser via ONNX. On a 1,000-position tactical benchmark the deployed model reaches ~25% top-1 accuracy — up from ~12% for the supervised baseline — while minimax search achieves 86–98% on the same set. The gap is intentional context: the NN compresses everything into a single fast forward pass with no search, making it a fundamentally different kind of player.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Play the Game</h2>
                <p>
                    Renju is deceptively simple in its rules but offers surprising strategic depth:
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '8px 16px',
                    background: 'var(--blog-surface-background)',
                    border: '1px solid var(--blog-surface-border, #333)',
                    borderRadius: '10px',
                    padding: '18px',
                    marginBottom: '16px',
                    fontSize: '0.95em'
                }}>
                    <b>Objective</b><span>Be the first to place five stones in an unbroken line</span>
                    <b>Board</b><span>15 × 15 grid (same as Go)</span>
                    <b>Turns</b><span>Players alternate placing stones; Black always moves first</span>
                    <b>Victory</b><span>Five consecutive stones - horizontal, vertical, or diagonal - wins</span>
                </div>
                <p>
                    <b>Why it's interesting:</b> Despite simple rules, Renju rewards thinking several moves ahead, recognizing tactical patterns like open threes and fours, and balancing offense with defense. A single misplaced stone can flip the game.
                </p>
                <RenjuGame />
                
                <p>
                    The Neural AI is selected by default. You can also switch to the Minimax engine or the On-Device LLM opponent using the buttons above the board.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Neural Network AI</h2>
                <p>
                    Two specialist models are trained and deployed: one for Black, one for White. A router picks the right model each turn based on which color the NN is playing. Each model learns entirely from experience — no hand-crafted evaluation function, no search tree — compressing everything it knows into a single fast forward pass.
                </p>

                <h3 className="headings">Architecture</h3>
                <p>
                    Each model is a <b>residual CNN</b> — the same architecture used by AlphaGo Zero, scaled down for the browser. The board is encoded as a <b>3-plane 15×15 tensor</b>: one plane for the current player's stones, one for the opponent's stones, and one indicating which color is to move. This relative encoding means the model sees the board the same way regardless of which color it's playing.
                </p>
                <p>
                    The network has two outputs trained simultaneously: a <b>policy head</b> that assigns probabilities to all 225 board cells (which move to play), and a <b>value head</b> that estimates the win probability for the current player. Sharing a single trunk for both outputs lets each task regularise the other.
                </p>
                <h5>Board-State Encoding and Convolutional Projection</h5>
                <p>
                    The model first turns the raw board tensor into learned pattern maps. A convolution does not divide the 3 input planes into 64 parts; it learns <b>64 separate filters</b>. Each filter looks at all 3 planes through a 3x3 window, computes one number at every board location, and produces one new 15x15 feature map.
                </p>

                <MermaidFigure
                    svg={tensorConvSvg}
                    label="Input planes, 3D filter, and 64 output feature maps"
                    caption="The 3-plane board representation is projected into 64 spatial feature maps by learned 3x3 filters."
                />

                <p>
                    A single first-layer filter has <code>3 x 3 x 3 = 27</code> weights: a 3x3 slice for the current-player plane, a 3x3 slice for the opponent plane, and a 3x3 slice for the side-to-move plane. The network has 64 such filters, so the output is <code>64 x 15 x 15</code>. The input block is <code>Conv2d(3, 64, kernel_size=3, padding=1)</code>, followed by batch normalization and ReLU. Because <code>padding=1</code>, the board stays 15x15 instead of shrinking to 13x13.
                </p>

                <h5>Shared Residual Feature Extractor</h5>
                <p>
                    The residual tower is the main body of the network: <b>6 identical residual blocks</b> stacked in sequence. Every block receives <code>64 x 15 x 15</code> and returns <code>64 x 15 x 15</code>, so it preserves both the board coordinates and the channel count. What changes is the meaning of the 64 maps: each block refines them into more tactical features.
                </p>
                <div className="renju-mermaid-pair">
                    <div className="renju-mermaid-panel">
                        <div className="renju-diagram-label">Residual block sequence</div>
                        <MermaidFigure
                            svg={residualTowerOverviewSvg}
                            label="Six-block residual tower"
                            caption="The tower repeats the same shape-preserving ResBlock six times."
                        />
                    </div>
                    <div className="renju-mermaid-panel">
                        <div className="renju-diagram-label">Residual block computation</div>
                        <MermaidFigure
                            svg={residualBlockSvg}
                            label="Single residual block detail"
                            caption="The skip path carries x around the learned update F(x), then both paths are added."
                        />
                    </div>
                </div>
                <p>
                    In one block, the convolutions compute a learned update <code>F(x)</code>. The skip path carries the original tensor <code>x</code> around those convolutions. The block then adds them: <code>output = ReLU(x + F(x))</code>. If a block has nothing useful to add, it can make <code>F(x)</code> close to zero and pass the original features forward. If it finds a useful refinement, it adds that refinement without destroying the existing representation.
                </p>
                <p>
                    Stacking 6 blocks gives 12 more 3x3 convolutions after the input block. That lets information spread across the board: early layers see immediate neighbors, later layers combine those local signals into open-threes, fours, blocks, forks, and competing threats.
                </p>

                <h5>Policy and Value Prediction Heads</h5>
                <p>
                    After the residual tower, the model branches into two heads. Both heads read the same shared <code>64 x 15 x 15</code> board understanding, but they answer different questions: the policy head scores moves, while the value head scores the whole position.
                </p>
                <MermaidFigure
                    svg={policyValueHeadsSvg}
                    label="Policy and value head tensor flow"
                    caption="A shared residual representation branches into a policy distribution over moves and a scalar value estimate."
                />
                <p>
                    The policy output is still raw logits, not final probabilities. In the browser, NN mode applies softmax, masks occupied cells, filters candidates to nearby empty cells, removes forbidden Black moves, renormalizes the remaining probabilities, and then picks the move. The value output is trained as a helper signal so the shared trunk learns whether patterns are actually winning, not just whether they look like the minimax teacher's next move.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '6px 20px',
                    background: 'var(--blog-surface-background)',
                    border: '1px solid color-mix(in srgb, var(--surface-text-color) 20%, transparent)',
                    borderRadius: '10px',
                    padding: '18px',
                    marginBottom: '20px',
                    fontSize: '0.9em'
                }}>
                    {[
                        ['Backbone', '6 residual blocks · 64 channels each'],
                        ['Parameters', '562k per model'],
                        ['Input', '(3, 15, 15) float32 — my stones / opponent stones / side-to-move'],
                        ['Policy output', '225 move logits (one per board cell)'],
                        ['Value output', 'Win probability ∈ [−1, +1]'],
                        ['Model size', '2.3 MB each · 4.6 MB total (ONNX float32)'],
                        ['Inference', '~5 ms per move · ONNX Runtime Web · fully client-side'],
                    ].map(([k, v]) => (
                        <React.Fragment key={k}>
                            <b style={{ whiteSpace: 'nowrap' }}>{k}</b><span>{v}</span>
                        </React.Fragment>
                    ))}
                </div>

                <h3 className="headings">Training Protocol</h3>
                <p>
                    The training pipeline was designed as a staged optimization procedure rather than a single end-to-end run. The model was first initialized through supervised imitation of a minimax teacher, then refined through reinforcement learning, color-specialized training, human-game adaptation, and tactical fine-tuning. Each stage addressed a specific failure mode observed in the previous stage.
                </p>
                <ol className="renju-training-protocol" aria-label="Renju neural-network training stages">
                    {[
                        {
                            stage: 'Stage 1',
                            title: 'Supervised Pre-training',
                            objective: 'Initialize the policy and value heads from a minimax teacher before reinforcement learning.',
                            procedure: 'Generated 5,000 stochastic minimax self-play games with depths sampled from 1–5, deduplicated them to 43,513 unique positions, and optimized for 80 epochs using joint policy cross-entropy and value regression.',
                            result: 'Validation move-match accuracy reached 46.6% against the minimax teacher, compared with a 0.4% random baseline. This checkpoint served as the initialization for all subsequent RL stages.',
                        },
                        {
                            stage: 'Stage 2',
                            title: 'Curriculum Reinforcement Learning Against Minimax',
                            objective: 'Improve the initialized model through direct game outcomes while controlling opponent difficulty.',
                            procedure: 'Fine-tuned with REINFORCE and a value baseline against a minimax opponent. Opponent depth increased automatically once the model exceeded a 60% win rate over the previous 50 games.',
                            result: 'After 550 update steps, the model reached a 57% overall win rate. The run exposed a strong color asymmetry: Black play improved rapidly, while White remained substantially weaker.',
                        },
                        {
                            stage: 'Stage 3',
                            title: 'Color-Specialized Policy Optimization',
                            objective: 'Remove interference between Black and White play induced by training a single policy on asymmetric roles.',
                            procedure: 'Forked the training process into two specialist models: one optimized only for Black positions and one optimized only for White positions.',
                            result: 'The Black specialist achieved 100% win rate against minimax depths 1–5 in head-to-head games. Golden-set top-1 tactical accuracy reached ~16%, a modest improvement over the RL baseline, reflecting the difficulty of the curated position set.',
                        },
                        {
                            stage: 'Stage 4',
                            title: 'Human-Game Supervised Adaptation',
                            objective: 'Expose the specialists to non-minimax strategies and human-discovered failure cases.',
                            procedure: 'Fine-tuned on 34 human-vs-NN games, treating winner moves as supervised targets with learning rate 5×10⁻⁵ and 30% original-data mixing to reduce catastrophic forgetting.',
                            result: 'Fine-tuning on human games improved in-game robustness to unconventional openings not present in minimax self-play. However, golden-set tactical accuracy was unchanged or slightly reduced (~16–18%), suggesting the human games added strategic variety rather than tactical sharpness.',
                        },
                        {
                            stage: 'Stage 5',
                            title: 'Tactical Constraint Training',
                            objective: 'Correct missed forced moves, especially blocks and immediate tactical responses.',
                            procedure: 'Constructed 20,000 forced-move positions from minimax self-play, trained first for move accuracy, then continued RL with a −0.5 penalty for missing forced tactical responses.',
                            result: 'Tactical constraint training produced the largest single improvement in golden-set accuracy: the Black model jumped from ~16% to ~23% and the White model from ~21% to ~27%, eliminating the major missed-four/block failure mode. Both models also achieved 100% win rate against minimax in head-to-head games.',
                        },
                        {
                            stage: 'Stage 6',
                            title: 'Online Human-Adaptive Reinforcement Learning',
                            objective: 'Continue adapting from interactive games against a human opponent after deployment-oriented fine-tuning.',
                            procedure: 'Used the CLI human RL gym to apply REINFORCE updates after a small buffer of played games, retaining the tactical penalty for missed forced moves. Separately, browser-exported games support offline behavioral-cloning fine-tuning on winner moves.',
                            result: 'In one gym session (28 games, 10 gradient updates) the White model gained ~83 Elo in the NN self-play pool. Golden-set tactical accuracy did not measurably improve, consistent with the gym providing game-strategy signal rather than forcing-move signal.',
                        },
                    ].map(({ stage, title, objective, procedure, result }, index) => (
                        <li className="renju-training-stage" key={stage}>
                            <div className="renju-training-stage-header">
                                <span className="renju-training-stage-index">{String(index + 1).padStart(2, '0')}</span>
                                <h5>{title}</h5>
                            </div>
                            <p><b>Objective.</b> {objective}</p>
                            <p><b>Procedure.</b> {procedure}</p>
                            <p><b>Result.</b> {result}</p>
                        </li>
                    ))}
                </ol>

                <h3 className="headings">Evaluation</h3>
                <p>
                    Each model is evaluated on a golden set of 1,000 curated positions covering immediate wins, forced blocks, fork tactics, and forbidden-move handling. Black checkpoints are scored on the 350 black-to-move positions; White checkpoints on the 350 white-to-move positions. This gives a stable, position-based measure of tactical skill that is not confounded by opponent search depth or game-to-game stochasticity.
                </p>
                <TrainingCurve />
                <p style={{ marginTop: '20px' }}>
                    The deployed pair (black_expert_v2 + white_expert_v2) reaches <b>~25% top-1 accuracy on the golden set</b> — up from ~12–15% for the supervised and RL baselines. The Tactical RL v2 phase produced the clearest jump: +8–10 percentage points over the Black Specialist plateau. For comparison, minimax reaches 86–98% on the same set, which makes the gap to tree-search explicit. The full training pipeline and model weights are available in the <a href="https://github.com/Pranshu258/Pranshu258.github.io/tree/react/src/renju/train" target="_blank" rel="noopener noreferrer">source repository</a>.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">The Minimax Foundation</h2>
                <p>
                    Before the neural network existed, minimax was the entire game. It also provided the NN's training foundation: thousands of minimax self-play games became the supervised dataset for phase 1, and a live minimax opponent served as the RL target through phase 5. Understanding how minimax works explains why the NN behaves the way it does — and which patterns were hardest to learn.
                </p>

                <h3 className="headings">Search-Based Baseline</h3>
                <p>
                    The minimax player is a deterministic search baseline over a 15x15 Renju board. It does not learn from data at inference time; instead, it enumerates plausible continuations, evaluates leaf positions with a hand-written tactical scoring function, and backs those scores up through the game tree. This makes it a useful contrast to the neural model: minimax is brittle when its heuristic misses a pattern, but highly reliable when a threat can be expressed as local tactical rules.
                </p>

                <h5>State Representation and Candidate Generation</h5>
                <p>
                    The engine represents the position as two move lists: one for the current player and one for the opponent. For fast membership checks, each coordinate is packed into an integer key and stored in a <code>Set</code>. Search is not run over all 225 cells. Instead, candidate moves are generated from the eight neighboring cells around existing stones, restricted to board bounds, deduplicated, and filtered against occupied locations. This preserves tactically relevant moves while avoiding a prohibitively large branching factor.
                </p>
                <p>
                    Candidate generation also applies Renju legality. When the side to move is Black, moves that create an overline, double-four, or double-three are removed before search. The remaining moves are scored with a lightweight move-ordering heuristic, then truncated to the top 10 candidates. This ordering is important: alpha-beta pruning only becomes effective when strong moves are searched early.
                </p>

                <h5>Depth-Limited Negamax Search</h5>
                <p>
                    Conceptually, minimax alternates between a maximizing player and a minimizing opponent. The implementation uses the equivalent <b>negamax</b> formulation: every recursive call swaps the two players, searches from the next side's perspective, and negates the returned score. This works because a position that is good for one side is bad for the other. The root call returns both the best score and the move that produced it; internal calls return only scalar scores.
                </p>
                <p>
                    Search stops when either the current move has ended the game or the configured depth limit has been reached. At that point, the static evaluator assigns a tactical score to the leaf. The backed-up value is therefore not a calibrated win probability; it is a bounded heuristic utility where larger values indicate stronger tactical prospects for the side to move.
                </p>

                <div className="renju-mermaid-pair renju-minimax-diagrams">
                    <div className="renju-mermaid-panel">
                        <div className="renju-diagram-label">Minimax value backup</div>
                        <MermaidFigure
                            svg={minimaxBackupSvg}
                            label="Minimax tree showing MAX and MIN value backup"
                            caption="The AI evaluates candidate moves by assuming the opponent will choose the reply that minimizes the AI's eventual score."
                        />
                    </div>
                    <div className="renju-mermaid-panel">
                        <div className="renju-diagram-label">Alpha-beta cutoff</div>
                        <MermaidFigure
                            svg={alphaBetaPruningSvg}
                            label="Alpha-beta pruning cutoff and transposition table reuse"
                            caption="Once a branch cannot beat the current best alternative, the engine skips the remaining replies and caches evaluated positions."
                        />
                    </div>
                </div>

                <h5>Alpha-Beta Pruning and Transposition Caching</h5>
                <p>
                    Alpha-beta pruning maintains two bounds during search: <code>alpha</code>, the best value already available to the maximizing side, and <code>beta</code>, the best value the minimizing side can force. If a branch becomes provably worse than an already explored alternative, the remaining replies under that branch are skipped. In negamax form, the recursive call passes the negated window <code>[-beta, -alpha]</code>, then negates the child score on return.
                </p>
                <p>
                    The search also uses a transposition table. A board position is hashed by sorting both move lists and serializing them; if the same position is reached again at an equal or greater remaining search depth, the cached score is reused. Entries store the backed-up score, remaining depth, and root best move, and the table is capped at 100,000 positions to prevent unbounded growth during long sessions.
                </p>

                <h5>Static Evaluation Function</h5>
                <p>
                    The evaluator is pattern-based and local to the last move. It scans four axes — horizontal, vertical, and the two diagonals — and assigns scores to tactical motifs. Immediate wins receive the maximum score. Near-winning structures such as double-fours, four-three combinations, double-threes, open fours, broken fours, and jump-threes receive progressively smaller scores. Defensive responses are explicitly represented as well: blocking an opponent's four is scored higher than creating many weaker threats.
                </p>
                <p>
                    A small center bonus encourages early moves near the middle of the board, but the dominant signal is tactical. This design made minimax strong enough to serve as a teacher, yet also explains the neural network's later failure modes: if the handcrafted evaluator underweights a multi-step trap, supervised imitation of minimax will inherit that blind spot.
                </p>

                <h5>Adaptive Search Depth</h5>
                <p>
                    The playable Minimax mode exposes fixed depths for easy, medium, and hard play, and an adaptive mode that changes depth according to game outcomes. Adaptive mode samples a depth between 1 and the current maximum depth on each AI move. When the player wins, the maximum depth may increase up to 10; when the AI wins, it decreases toward 1. The result is a search opponent whose tactical horizon expands or contracts with the player's performance rather than remaining fixed for the entire session.
                </p>

                <h3 className="headings">Renju Forbidden Moves</h3>
                <p>
                    What makes Renju different from plain Gomoku? Special rules for Black that offset the first-player advantage. Three "forbidden moves" are illegal for Black:
                </p>
                <ul>
                    <li><b>Overline:</b> Six or more stones in a row. Only exactly five wins.</li>
                    <li><b>Double-Four:</b> A single stone simultaneously creating two separate fours — two threats the opponent can't both block.</li>
                    <li><b>Double-Three:</b> A single stone creating two open threes. Same idea: an unstoppable double threat.</li>
                </ul>
                <p>
                    These restrictions exist because without them, Black can always force a win. They also explain why separate Black and White specialists were needed: the NN had to learn an asymmetric game where one color has strictly different legal moves.
                </p>

                <div style={{
                    background: 'rgba(246, 173, 85, 0.1)',
                    border: '1px solid #f6ad55',
                    borderRadius: '4px',
                    padding: '20px',
                    marginTop: '20px'
                }}>
                    <h4 style={{ color: '#f6ad55', marginBottom: '10px' }}>
                        <FaBolt style={{ marginRight: '10px' }} />
                        Adaptive Difficulty
                    </h4>
                    <p style={{ marginBottom: 0 }}>
                        In Minimax mode, <b>Adaptive</b> difficulty adjusts search depth based on your performance: win and it goes deeper (harder), lose and it backs off. This creates a personalized challenge that mirrors your skill level in real time. In LLM mode, the calibration runs in reverse — the AI gets easier when it wins, harder when the LLM wins.
                    </p>
                </div>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Playing Against an LLM</h2>
                <p>
                    What happens when you put a purpose-built game engine against a general-purpose language model? The minimax AI sees the board as numbers — scores, depths, pruned branches. The LLM sees it as text — a grid of symbols it must reason about spatially. They think in fundamentally different ways, and playing against one reveals surprising things about both.
                </p>
                <p>
                    In the game above, select <b>On-Device LLM</b> as your opponent. It runs a small language model entirely in your browser via <a href="https://webllm.mlc.ai/" target="_blank" rel="noopener noreferrer">WebLLM</a> + WebGPU — no server or API key needed. Pick a model, click load, and play. Weights are cached after the first download. Requires Chrome or Edge with WebGPU support.
                </p>
                <p>
                    The LLM receives a structured description of the board state, move history, and tactical hints (win threats, open threes) so it has a fighting chance. Despite this, most small models struggle with spatial reasoning — watching them make unexpected moves is part of the fun.
                </p>

                <p>
                    The LLM receives a text representation of the board along with strategic guidance and responds with its next move in algebraic notation (e.g. H8). A few things make this mode interesting:
                </p>
                <ul>
                    <li><b>Threat Hints:</b> The LLM receives pre-computed threat analysis in its prompt. With hints enabled, the prompt includes specific blocking coordinates for the opponent's open threes and fours - without them, the LLM must figure out threats on its own from the raw board state.</li>
                    <li><b>Adaptive Difficulty:</b> The difficulty adjustment works in reverse here. When the local AI wins, its search depth <i>decreases</i> to give the LLM a better chance. When the LLM wins, the AI gets harder. This creates an interesting dynamic where the AI calibrates itself to the LLM's skill level.</li>
                    <li><b>Visualize AI:</b> You can enable the "Visualize AI" toggle to watch the minimax algorithm explore candidate moves in real time during the local AI's turn.</li>
                </ul>
                <p>
                    The minimax AI usually wins - but the LLM can occasionally pull off surprisingly creative moves. It might ignore a conventional threat to set up an unexpected diagonal, or find a pattern that the AI's evaluation function undervalues. It's a fascinating window into how language models reason about spatial strategy.
                </p>
                <ul style={{ marginBottom: '20px' }}>
                    <li>Watch two fundamentally different intelligences clash in real time</li>
                    <li>See how LLMs reason (and struggle) with spatial strategy</li>
                    <li>Observe adaptive difficulty calibrating itself to the LLM's skill level</li>
                    <li>Toggle threat hints on/off to see how much tactical help the LLM needs</li>
                </ul>

                <div style={{
                    background: 'rgba(66, 153, 225, 0.1)',
                    border: '1px solid #4299e1',
                    borderRadius: '4px',
                    padding: '20px',
                    marginTop: '30px'
                }}>
                    <h4 style={{ color: '#4299e1', marginBottom: '10px' }}>
                        <FaBrain style={{ marginRight: '10px' }} />
                        Fun Fact
                    </h4>
                    <p style={{ marginBottom: 0 }}>
                        In 2001, researchers proved that with perfect play, the first player (Black) always wins in standard Gomoku.
                        This led to the creation of Renju, which adds special rules to balance the game. In this implementation,
                        the AI uses adaptive difficulty - it gets stronger when you win and easier when you lose, creating a personalized challenge that grows with your skill!
                    </p>
                </div>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Source Code</h2>
                <p>
                    The complete source code for this project is available on GitHub. You can run it locally or deploy it to any static hosting service.
                </p>
                <p>
                    Whether you're interested in game AI, React development, or just enjoy strategic board games - give it a try. Can you beat Adaptive mode? If you find a bug, have an idea, or just want to share a particularly wild LLM game, feel free to <a href="https://github.com/Pranshu258/Pranshu258.github.io/issues" target="_blank" rel="noopener noreferrer">open an issue</a> or submit a PR.
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '8px 16px',
                    background: 'var(--blog-surface-background)',
                    border: '1px solid var(--blog-surface-border, #333)',
                    borderRadius: '10px',
                    padding: '18px',
                    marginBottom: '20px',
                    fontSize: '0.95em'
                }}>
                    <b>UI</b><span>React class components with inline styles for game elements</span>
                    <b>AI Engine</b><span>Minimax with alpha-beta pruning, transposition table, and pattern-based evaluation</span>
                    <b>Board State</b><span>2D array (15x15) with numeric cell values; serialized to algebraic notation for LLM prompts</span>
                    <b>On-Device LLM</b><span><a href="https://webllm.mlc.ai/" target="_blank" rel="noopener noreferrer">WebLLM</a> + WebGPU — runs entirely in-browser, no server required</span>
                    <b>Build</b><span>Vite for fast development and optimized production builds</span>
                </div>
                <a
                    href="https://github.com/Pranshu258/Pranshu258.github.io/tree/react/src/renju"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="github-source-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #24292e, #1a1e22)',
                        color: '#fff',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '0.95em',
                        marginTop: '15px',
                        marginBottom: '15px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        transition: 'all 0.2s'
                    }}
                >
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                    </svg>
                    View Source on GitHub
                </a>
                                <hr></hr>

            </div>
        );
    }
}
