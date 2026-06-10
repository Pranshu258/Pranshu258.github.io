import React from 'react';
import Sharer from "../sharer";
import RenjuGame from '../renju/RenjuGame';

import "../styles/prism.css";
import '../styles/fonts.css';
import '../styles/blog.css';

import architectureSvg from './renju/architecture.svg';
import TrainingCurve from './renju/TrainingCurve';

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
                    Renju looks simple — place stones, get five in a row — but beneath that simplicity lies a game strategically rich enough that mathematicians proved perfect Black play always wins without special restrictions. This project trains a neural network to play it: six phases spanning supervised learning, reinforcement learning against a minimax engine, specialist training by color, human fine-tuning, and a live browser gym. The result runs fully in-browser via ONNX and reaches a 97% win rate against the minimax engine it was trained against.
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
                    The <b>🧠 Neural AI</b> is selected by default — challenge it directly. Switch to <b>🤖 Minimax</b> for a more traditional opponent, or try <b>💻 On-Device LLM</b> to watch two AI systems clash.
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
                <div style={{ margin: '24px 0', textAlign: 'center' }}>
                    <img
                        src={architectureSvg}
                        alt="RenjuNet architecture diagram"
                        style={{ width: '100%', maxWidth: '780px', borderRadius: '10px' }}
                    />
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '6px 20px',
                    background: 'var(--blog-surface-background)',
                    border: '1px solid var(--blog-surface-border, #333)',
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

                <h3 className="headings">Training</h3>
                <p>
                    Training proceeded in six phases — starting from minimax self-play data, advancing through reinforcement learning, specialising by color, then fine-tuning on human games and tactical patterns.
                </p>
                <table>
                    <thead>
                        <tr>
                            <th style={{ whiteSpace: 'nowrap' }}>Phase</th>
                            <th>Method</th>
                            <th>Key outcome</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            [
                                '1 — Supervised',
                                '5,000 minimax self-play games (depths 1–5, stochastic) → 43,513 unique positions. 80 epochs of policy + value loss.',
                                '46.6% move-match accuracy vs minimax (random baseline: 0.4%). Starting point for all RL phases.',
                            ],
                            [
                                '2 — RL vs Minimax',
                                'REINFORCE against a minimax opponent that auto-advances difficulty when the model wins >60% of its last 50 games. 550 update steps.',
                                '57% overall win rate. Clear Black–White gap emerged: Black strong, White weak. Sharing one model for both colors caused interference.',
                            ],
                            [
                                '3 — Color Specialists',
                                'Training forked into two models. Each plays only its own color — Black expert vs White opponent, White expert vs Black opponent.',
                                'Black: 100% win rate vs minimax depths 1–5. White: 76.5% overall, consistent at depths 1–3, volatile at depth 4 (22–65%).',
                            ],
                            [
                                '4 — Human FT',
                                '34 human-vs-NN games. Winner\'s moves used as supervised targets (lr=5×10⁻⁵, 30% original-data mixing to prevent forgetting).',
                                'White depth-4: 22% → 94%. Black depth-5: 0% → 84%. Single session, immediate impact.',
                            ],
                            [
                                '5 — Tactical RL',
                                '20,000 forced-move positions from minimax self-play. Supervised FT for move accuracy, then RL with −0.5 penalty per missed forced move.',
                                '91–92% forced-move accuracy. White: 100% vs depths 1–4. Black: 100% vs all depths. Blind spot for missed fours/blocks eliminated.',
                            ],
                            [
                                '6 — Human RL Gym',
                                'Live games vs human via browser gym. REINFORCE updates every few games (same tactical penalty). Imitation mode: BC loss on human wins.',
                                'White model: +83 Elo after 28 games / 10 updates. Addresses unconventional openings and multi-step traps unseen in minimax play.',
                            ],
                        ].map(([phase, method, outcome]) => (
                            <tr key={phase}>
                                <td style={{ whiteSpace: 'nowrap', fontWeight: 600, verticalAlign: 'top' }}>{phase}</td>
                                <td style={{ verticalAlign: 'top', fontSize: '0.88em' }}>{method}</td>
                                <td style={{ verticalAlign: 'top', fontSize: '0.88em' }}>{outcome}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <h3 className="headings">Evaluation</h3>
                <p>
                    Each model is evaluated in its specialist role against minimax depth-3 (30 games, temperature 0.3). Results are substantially more reliable than per-depth win rates — those collapse to binary 0%/100% because temperature=0 with a deterministic opponent produces the same game every time.
                </p>
                <TrainingCurve />
                <p style={{ marginTop: '20px' }}>
                    Using each model in its specialist role, the combined system reaches <b>~97% win rate vs minimax depth-3</b> — up from 27% for the supervised-only model. The full training pipeline and model weights are available in the <a href="https://github.com/Pranshu258/Pranshu258.github.io/tree/react/src/renju/train" target="_blank" rel="noopener noreferrer">source repository</a>.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">The Minimax Foundation</h2>
                <p>
                    Before the neural network existed, minimax was the entire game. It also provided the NN's training foundation: thousands of minimax self-play games became the supervised dataset for phase 1, and a live minimax opponent served as the RL target through phase 5. Understanding how minimax works explains why the NN behaves the way it does — and which patterns were hardest to learn.
                </p>
                <p>
                    Minimax builds a tree of possible futures — alternating between each side's best moves — and picks the branch that guarantees the best outcome against a perfect opponent. <b>Alpha-beta pruning</b> cuts branches that can't improve on an already-found solution, reducing millions of evaluations to thousands. Move ordering, a transposition table, and pattern-based scoring (open fours, double-threes, forced combinations) keep move times under ~200ms at depth 10.
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
