import React from 'react';
import Sharer from "../sharer";
import RenjuGame from '../renju/RenjuGame';

import "../styles/prism.css";
import '../styles/fonts.css';
import '../styles/blog.css';

import { FaGamepad, FaBrain, FaReact, FaGears, FaBolt, FaNetworkWired } from 'react-icons/fa6';

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
                    Renju looks simple at first glance - place stones, get five in a row - but beneath that simplicity lies a game so strategically rich that researchers proved perfect play guarantees a win for Black. This project brings that depth into the browser with a fast, optimized minimax AI, four difficulty levels including an adaptive mode that learns from your play, and a unique mode where you can pit the AI against a large language model and watch two very different intelligences clash.
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
                    The current search depth is displayed during gameplay. <b>Adaptive</b> mode is especially interesting - when you win, the AI's search depth increases by 1 (up to a maximum of 10), making it progressively harder. Lose, and it dials back down. This creates a personalized challenge that feels almost human: the AI is always just slightly ahead of or behind your skill level. For example, if you beat it twice in a row, its depth might jump from 5 to 7, making the third game noticeably tougher.
                </p>
                <p>
                    Choose your stone color and difficulty, and see if you can beat it!
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">The Minimax Algorithm</h2>
                <p>
                    Imagine the AI staring at the board and asking: <i>"If I place a stone here, what's the best my opponent can do? And then what's my best reply to that?"</i> That recursive question is the heart of the <b>minimax algorithm</b>. At each turn, the AI builds a tree of possible futures - alternating between its own best moves and the opponent's best responses - and chooses the path that leads to the best guaranteed outcome, even against a perfect opponent.
                </p>
                <p>
                    But the tree grows fast. On a 15×15 board, even a few moves deep can mean millions of positions. That's where <b>alpha-beta pruning</b> comes in - it cuts away branches that can't possibly beat an already-discovered option. Think of it as the AI saying, <i>"I already found a move that guarantees a score of +50. This new branch can only reach +30 at best - skip it."</i> In practice, this eliminates the vast majority of the search space.
                </p>
                <p>
                    Several additional optimizations keep the AI responsive even at higher search depths:
                </p>
                <ul>
                    <li><b>Transposition Table:</b> A hash map caches previously evaluated board positions to avoid redundant work when different move orderings lead to the same state.</li>
                    <li><b>Move Ordering:</b> Candidate moves are scored with a quick heuristic and sorted before the full search begins. Good move ordering triggers more alpha-beta cutoffs, making the search significantly faster.</li>
                    <li><b>Pattern-Based Evaluation:</b> The evaluation function recognizes tactical patterns - open fours, broken fours, double threes, jump threes - and assigns calibrated scores to each. It also detects powerful combinations like four-three or double-four that force a win.</li>
                </ul>

                <h3 className="headings">Renju Forbidden Moves</h3>
                <p>
                    What makes Renju different from plain Gomoku? Special rules for Black that prevent the first-player advantage from dominating. These "forbidden moves" are moves that Black is not allowed to make:
                </p>
                <ul>
                    <li><b>Overline:</b> Placing a stone that creates six or more in a row. Only exactly five wins.</li>
                    <li><b>Double-Four:</b> A single stone that simultaneously creates two separate lines of four. This would be too powerful - it forces two threats the opponent can't both block.</li>
                    <li><b>Double-Three:</b> A single stone that creates two open threes (lines of three with both ends open). Like double-four, it creates an unstoppable double threat.</li>
                </ul>
                <p>
                    These rules exist because mathematicians proved that without them, Black (who moves first) can always force a win. By restricting Black's most explosive tactics, Renju restores the balance and rewards deeper strategic thinking for both sides. The AI detects and enforces all of these restrictions automatically.
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
                        Performance
                    </h4>
                    <p style={{ marginBottom: 0 }}>
                        At depth 10, the search space explodes to millions of possible positions. With alpha-beta pruning, move ordering, and a transposition table, the AI evaluates only a tiny fraction of them - keeping move times under ~200ms on modern hardware. The transposition table alone can cut redundant evaluations by over 40% in complex mid-game positions.
                    </p>
                </div>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Neural Network AI</h2>
                <p>
                    The minimax AI searches an explicit game tree guided by hand-crafted heuristics. The neural network takes the opposite approach — it learns what good positions look like entirely from experience, compressing that intuition into a single fast forward pass. In the game above, select <b>🧠 Neural AI</b> as your opponent.
                </p>
                <p>
                    Below is the system card for <b>renju_policy v2.0</b> — a pair of color-specialist policy and value networks trained to play 15×15 Renju. A router selects the black expert or white expert at runtime based on which color the NN is assigned.
                </p>

                <h3 className="headings">Model Overview</h3>
                <table>
                    <tbody>
                        {[
                            ['Model name', 'renju_policy v2.0 (black expert + white expert)'],
                            ['Architecture', 'Residual CNN — 6 blocks × 64 channels (shared)'],
                            ['Parameters', '562,057 (~562k) per model'],
                            ['Model size', '2.3 MB each (ONNX, float32) · 4.6 MB total'],
                            ['Inputs', '(1, 3, 15, 15) float32 tensor — my stones, opponent stones, side-to-move'],
                            ['Outputs', 'Policy: (1, 225) move logits · Value: scalar ∈ [−1, +1]'],
                            ['Runtime', 'ONNX Runtime Web — WebAssembly backend, single-threaded'],
                            ['Inference latency', '~4–6 ms per move (no lookahead)'],
                            ['Deployment', 'Fully client-side — renju_black.onnx and renju_white.onnx fetched from /models/'],
                        ].map(([k, v]) => (
                            <tr key={k}>
                                <td style={{ fontWeight: 600, whiteSpace: 'nowrap', width: '30%', verticalAlign: 'top' }}>{k}</td>
                                <td>{v}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 className="headings">Training Data</h3>
                <p>
                    Training data was generated entirely through self-play between minimax agents at varying search depths (1–5), with stochastic move selection to maximise position diversity.
                </p>
                <ul>
                    <li><b>5,000 games</b> played between minimax agents. Black and White depths were drawn independently from depths 1–5 to expose the network to asymmetric tactical situations.</li>
                    <li><b>Stochastic sampling</b> — moves were drawn via softmax over minimax scores with temperature τ = 1.5, producing divergent game lines far from the deterministic minimax path.</li>
                    <li><b>Deduplication</b> — of the ~91,900 raw positions, 52.7% were duplicates. After merging (averaging value targets for duplicate states), <b>43,513 unique positions</b> remained.</li>
                    <li><b>Labels</b> — policy target: the minimax best move; value target: the final game outcome (+1 win / −1 loss) from the perspective of the player to move.</li>
                </ul>
                <p>
                    No human game records were used. The dataset is entirely synthetic and reflects minimax play quality at shallow to medium depths.
                </p>

                <h3 className="headings">Training</h3>
                <p>Training proceeded in three phases:</p>
                <p>
                    <b>Phase 1 — Supervised imitation (80 epochs).</b> The network was trained to predict the minimax best move (cross-entropy policy loss) and the game outcome (MSE value loss) on the 43,513-position dataset. At the best checkpoint (epoch 10), the model reached <b>46.6% top-1 move accuracy</b> against minimax choices — far above the random baseline of 0.4% for a 225-class problem. This phase establishes a strong tactical prior before any reinforcement learning.
                </p>
                <p>
                    <b>Phase 2 — REINFORCE vs Minimax with curriculum.</b> The pre-trained network plays against minimax opponents with alternating colors. Gradients use the REINFORCE policy gradient algorithm with a value-network baseline to reduce variance. An entropy bonus encourages exploration. The opponent starts at depth 1 and advances once the model exceeds 60% win rate over 50 games, progressing up to depth 6. Black and White gradients are computed <i>separately</i> — mixing them caused White's rare wins to be normalized against Black's frequent wins, drowning out White's learning signal. After ~550 steps the combined model peaked at <b>57% overall win rate</b> but with a stark asymmetry: Black at 100% (depths 1–4) vs White struggling at 15–30%.
                </p>
                <p>
                    <b>Phase 3 — Color-specific expert fine-tuning.</b> To address the asymmetry, training was forked from the Phase 2 checkpoint into two specialist models, each locked to a single color for all training games:
                </p>
                <ul>
                    <li><b>Black expert</b> — trained exclusively as Black. Converged to 100% win rate vs minimax depths 1–5 over 725 update steps. d1–d4 remained perfect across every evaluation with no forgetting.</li>
                    <li><b>White expert</b> — trained exclusively as White. White's learning exploded once it had 100% of the gradient signal — it promoted through depths 1→6 in just 28 steps (vs 195 in Phase 2), reaching a peak overall win rate of <b>76.5%</b> at step 475. White d4 proved the hardest challenge, breaking through to 65% but not consistently holding.</li>
                </ul>
                <p>
                    The deployed system uses a <b>runtime router</b>: when the NN plays Black it uses <code>renju_black.onnx</code>; when it plays White it uses <code>renju_white.onnx</code>. Both share the same architecture — only the weights differ. Both load in parallel in the browser; the correct model is selected per turn at near-zero overhead.
                </p>

                <h3 className="headings">Evaluation</h3>
                <p>
                    Each expert was evaluated in 30-game matches per depth configuration at temperature τ = 0.3 (near-greedy). Results are shown for both the specialist role and the opposite color (where the model was not trained).
                </p>
                <p><b>Black Expert</b> — <code>renju_black.onnx</code>, step 725, overall <b>62%</b></p>
                <table>
                    <thead>
                        <tr>
                            <th>vs Minimax depth</th>
                            <th style={{ textAlign: 'right' }}>As Black ★</th>
                            <th style={{ textAlign: 'right' }}>As White (not trained)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['depth-1', '100%', '10%'],
                            ['depth-2', '100%', '55%'],
                            ['depth-3', '100%', '55%'],
                            ['depth-4', '100%',  '0%'],
                            ['depth-5', '100%',  '0%'],
                        ].map(([opp, b, w]) => (
                            <tr key={opp}>
                                <td>{opp}</td>
                                <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{b}</td>
                                <td style={{ textAlign: 'right', color: Number(w.replace('%','')) >= 50 ? '#10b981' : '#f87171', fontWeight: 600 }}>{w}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--surface-text-color)' }}>
                            <td>Average</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>100%</td>
                            <td style={{ textAlign: 'right', color: '#f87171' }}>24%</td>
                        </tr>
                    </tbody>
                </table>
                <p style={{ marginTop: '16px' }}><b>White Expert</b> — <code>renju_white.onnx</code>, step 475, overall <b>76.5%</b></p>
                <table>
                    <thead>
                        <tr>
                            <th>vs Minimax depth</th>
                            <th style={{ textAlign: 'right' }}>As Black (not trained)</th>
                            <th style={{ textAlign: 'right' }}>As White ★</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            ['depth-1', '95%',  '100%'],
                            ['depth-2', '100%',  '95%'],
                            ['depth-3',  '75%', '100%'],
                            ['depth-4',  '95%',  '35%'],
                            ['depth-5',   '0%',  '70%'],
                        ].map(([opp, b, w]) => (
                            <tr key={opp}>
                                <td>{opp}</td>
                                <td style={{ textAlign: 'right', color: Number(b.replace('%','')) >= 50 ? '#10b981' : '#f87171', fontWeight: 600 }}>{b}</td>
                                <td style={{ textAlign: 'right', color: Number(w.replace('%','')) >= 50 ? '#10b981' : '#f87171', fontWeight: 600 }}>{w}</td>
                            </tr>
                        ))}
                        <tr style={{ fontWeight: 700, borderTop: '2px solid var(--surface-text-color)' }}>
                            <td>Average</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>73%</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>80%</td>
                        </tr>
                    </tbody>
                </table>
                <p style={{ marginTop: '16px' }}>
                    The routed system (each model playing its specialist color) achieves a <b>76.5% combined win rate</b> — up from 57% for the single Phase 2 model and 9% for the raw supervised model. The white expert's White play now matches or exceeds the black expert's Black play at most depths.
                </p>

                <h3 className="headings">Limitations</h3>
                <ul>
                    <li><b>Color specialisation cuts both ways.</b> The black expert struggles as White (24% win rate) and the white expert forgets Black play over time (B-d3 collapsed to 0% by step 700). Each model excels <i>only</i> in its trained color at deep search depths.</li>
                    <li><b>White depth-4 is the hard wall.</b> Despite reaching 65% win rate against depth-4 minimax as White during some training windows, the white expert couldn't consistently hold that skill — it oscillated between 0% and 65% across consecutive evaluations. A larger model or longer training would be needed to consolidate depth-4 White defense.</li>
                    <li><b>No lookahead.</b> Both models make a single forward pass per move with no search. Strong minimax agents with deep search (depth 5+) can exploit multi-move threats that the models fail to foresee without a search tree.</li>
                    <li><b>Eval noise.</b> Win rate estimates from 20-game matches carry ±15–20% error. Some apparent regressions (e.g. d3 dropping to 0%) were sampling artifacts, not genuine forgetting — confirmed by recovery in the next evaluation.</li>
                    <li><b>Shallow training data.</b> The supervised pre-training used positions from minimax depths 1–5. The models absorbed patterns from shallow, imperfect play before refinement via RL.</li>
                </ul>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Playing Against an LLM</h2>
                <p>
                    What happens when you put a purpose-built game engine against a general-purpose language model? The minimax AI sees the board as numbers — scores, depths, pruned branches. The LLM sees it as text — a grid of symbols it must reason about spatially. They think in fundamentally different ways, and playing against one reveals surprising things about both.
                </p>
                <p>
                    In the game above, select <b>On-Device LLM</b> or <b>API LLM</b> as your opponent. The on-device option runs a small language model entirely in your browser via WebGPU (no server needed). The API option connects to any OpenAI-compatible endpoint — Docker Model Runner, Ollama, Azure OpenAI, and so on.
                </p>
                <p>
                    The LLM receives a structured description of the board state, move history, and tactical hints (win threats, open threes) so it has a fighting chance. Despite this, most small models struggle with spatial reasoning — watching them make unexpected moves is part of the fun.
                </p>

                <h3 className="headings">Connecting an LLM</h3>
                <p>
                    There are two ways to bring an LLM into the game:
                </p>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginTop: '16px',
                    marginBottom: '20px'
                }}>
                    <div style={{
                        background: 'var(--blog-surface-background)',
                        border: '1px solid var(--blog-surface-border, #333)',
                        borderRadius: '10px',
                        padding: '18px'
                    }}>
                        <div style={{ fontWeight: '600', fontSize: '1em', marginBottom: '8px' }}>💻 On-Device</div>
                        <p style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '10px' }}>
                            Runs entirely in your browser via <a href="https://webllm.mlc.ai/" target="_blank" rel="noopener noreferrer">WebLLM</a> + WebGPU. No server needed. Pick a model, click load, and play. Weights are cached after first download. Requires Chrome/Edge with WebGPU support.
                        </p>
                    </div>
                    <div style={{
                        background: 'var(--blog-surface-background)',
                        border: '1px solid var(--blog-surface-border, #333)',
                        borderRadius: '10px',
                        padding: '18px'
                    }}>
                        <div style={{ fontWeight: '600', fontSize: '1em', marginBottom: '8px' }}>🔌 API</div>
                        <p style={{ fontSize: '0.9em', opacity: 0.8, marginBottom: '10px' }}>
                            Connects to any OpenAI-compatible chat completions endpoint - local or cloud. Works with Docker Model Runner, Ollama, LM Studio, Azure OpenAI, OpenAI, and more. Just paste the full URL, add a model name and API key if needed.
                        </p>
                    </div>
                </div>

                <details style={{ marginBottom: '20px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600', fontSize: '0.95em', opacity: 0.9 }}>Example API endpoints</summary>
                    <ul style={{ marginTop: '10px' }}>
                        <li><b>Docker Model Runner:</b> <code>http://localhost:12434/engines/llama.cpp/v1/chat/completions</code> · model: <code>ai/mistral</code></li>
                        <li><b>Ollama:</b> <code>http://localhost:11434/v1/chat/completions</code> · model: <code>llama3</code></li>
                        <li><b>LM Studio:</b> <code>http://localhost:1234/v1/chat/completions</code></li>
                        <li><b>Azure OpenAI:</b> <code>https://&lt;resource&gt;.openai.azure.com/openai/deployments/&lt;model&gt;/chat/completions?api-version=2024-02-01</code> + API key</li>
                        <li><b>OpenAI:</b> <code>https://api.openai.com/v1/chat/completions</code> + API key</li>
                    </ul>
                </details>

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
                    <b>On-Device LLM</b><span><a href="https://webllm.mlc.ai/" target="_blank" rel="noopener noreferrer">WebLLM</a> + WebGPU - runs entirely in-browser, no server required</span>
                    <b>API LLM</b><span>Any OpenAI-compatible chat completions endpoint (Ollama, LM Studio, Azure, etc.)</span>
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
