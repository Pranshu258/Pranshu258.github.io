import React from 'react';
import Sharer from "../sharer";
import RenjuGame from '../renju/RenjuGame';

import "../styles/prism.css";
import '../styles/fonts.css';
import '../styles/blog.css';

import { FaGamepad, FaBrain, FaReact } from 'react-icons/fa6';

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
                <p>Pranshu Gupta, February 15, 2026</p>
                <Sharer link={window.location.href} title={"Renju - A Strategic Board Game with AI"}></Sharer>

                <p className="introduction">
                    Renju, also known as "Five in a Row" or Gomoku, is a classic strategic board game that has been played for centuries across Asia and beyond. I present a modern web implementation of Renju using React, complete with an AI opponent powered by the minimax algorithm with alpha-beta pruning.
                </p>
                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">Play the Game</h2>
                <p>
                    Renju is deceptively simple in its rules but offers surprising strategic depth:
                </p>
                <ul>
                    <li><b>Objective:</b> Be the first player to create an unbroken line of five stones on the board</li>
                    <li><b>Board:</b> Played on a 15×15 grid (similar to Go)</li>
                    <li><b>Turns:</b> Players alternate placing stones, with black always going first</li>
                    <li><b>Victory:</b> Five consecutive stones in any direction (horizontal, vertical, or diagonal) wins</li>
                </ul>
                <RenjuGame mode="pvai" />
                <p>
                    The AI uses minimax search with alpha-beta pruning with <b>adaptive difficulty</b> - it learns from each game! If you win, the AI increases its search depth (max 10) to become more challenging. If you lose, it decreases depth (min 2) to give you a better chance. The current and max depth are displayed during gameplay. Choose your stone color and see if you can beat it!
                </p>
                <p>
                    While the rules are simple, mastering Renju requires thinking several moves ahead, recognizing patterns, and understanding both offensive and defensive strategies.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>
                <h2 className="headings">AI vs LLM</h2>
                <p>
                    Pit the minimax AI against a language model and watch them battle it out. The LLM plays Black, the minimax AI plays White, and the game runs automatically.
                </p>
                <RenjuGame mode="aivsllm" />

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
                            Connects to any OpenAI-compatible chat completions endpoint — local or cloud. Works with any model you've pulled locally, or any cloud provider. Just paste the full URL, add a model name and API key if needed.
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

                <h3 className="headings">What to Watch For</h3>
                <ul>
                    <li><b>Threat Hints:</b> Toggle whether the LLM receives pre-computed threat analysis. With hints, the prompt includes specific blocking coordinates — without them, the LLM must reason about threats from the raw board state.</li>
                    <li><b>Adaptive Difficulty:</b> Works in reverse here — when the minimax AI wins, its depth <i>decreases</i> to give the LLM a better chance. When the LLM wins, the AI gets harder.</li>
                    <li><b>Visualize AI:</b> Watch the minimax algorithm explore candidate moves in real time.</li>
                </ul>
                <p>
                    Spoiler: the minimax AI usually wins, but LLMs can occasionally pull off surprising moves!
                </p>

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
                    The complete source code for this project is available on GitHub. You can run it locally or deploy it to any static hosting service. The game demonstrates how classic game-playing algorithms can create engaging experiences in modern web applications.
                </p>
                <p>
                    Whether you're interested in game AI, React development, or just enjoy strategic board games, I hope this project provides both entertainment and educational value. Challenge the AI and see how you stack up!
                </p>
                <a
                    href="https://github.com/Pranshu258/Pranshu258.github.io/tree/react/src/renju"
                    target="_blank"
                    rel="noopener noreferrer"
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
                                <hr style={{ backgroundColor: "white" }}></hr>

            </div>
        );
    }
}
