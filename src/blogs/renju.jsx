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
        document.title = "Building Renju: A Strategic Board Game with AI | blog by Pranshu Gupta";
    }
    
    render() {
        return (
            <div className="language-javascript">
                <div className="row bhead">
                    <FaGamepad className="bigger gt1" />
                </div>
                <h1 className="title">Building Renju: A Strategic Board Game with AI</h1>
                <p>Pranshu Gupta, February 15, 2026</p>
                <Sharer link={window.location.href} title={"Building Renju: A Strategic Board Game with AI"}></Sharer>
                
                <p className="introduction">
                    Renju, also known as "Five in a Row" or Gomoku, is a classic strategic board game  that has been played for centuries across Asia and beyond. In this project, I built a modern web implementation of Renju using React, complete with an AI opponent powered by the minimax algorithm with alpha-beta pruning. The result is a clean, minimalist game that runs entirely in the browser with no external dependencies.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">Play the Game</h2>
                <p>
                    Before we dive into the technical details, why not try playing the game yourself? The AI uses a depth-4 minimax search with alpha-beta pruning, making it a challenging opponent. Choose your stone color and see if you can beat it!
                </p>

                <RenjuGame />

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">The Game Rules</h2>
                <p>
                    Renju is deceptively simple in its rules but offers surprising strategic depth:
                </p>
                <ul>
                    <li><b>Objective:</b> Be the first player to create an unbroken line of five stones on the board</li>
                    <li><b>Board:</b> Played on a 15×15 grid (similar to Go)</li>
                    <li><b>Turns:</b> Players alternate placing stones, with black always going first</li>
                    <li><b>Victory:</b> Five consecutive stones in any direction (horizontal, vertical, or diagonal) wins</li>
                    <li><b>No Draw:</b> The game theoretically always has a winner if both players play optimally</li>
                </ul>
                <p>
                    While the rules are simple, mastering Renju requires thinking several moves ahead, recognizing patterns, and understanding both offensive and defensive strategies.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">The AI: Minimax with Alpha-Beta Pruning</h2>
                <p>
                    The heart of this project is the AI opponent. I implemented the classic <b>minimax algorithm</b> with <b>alpha-beta pruning</b> to make the AI both strategic and performant.
                </p>

                <h3>How Minimax Works</h3>
                <p>
                    Minimax is a decision-making algorithm used in two-player games. It works by:
                </p>
                <ol>
                    <li><b>Looking Ahead:</b> Exploring possible future game states up to a certain depth</li>
                    <li><b>Evaluating Positions:</b> Scoring each position based on how favorable it is</li>
                    <li><b>Maximizing/Minimizing:</b> The AI tries to maximize its score while assuming the opponent will minimize it</li>
                    <li><b>Choosing the Best Move:</b> Selecting the move that leads to the best guaranteed outcome</li>
                </ol>

                <h3>Alpha-Beta Pruning Optimization</h3>
                <p>
                    Without optimization, minimax must explore every possible game tree branch. For a game like Renju, this becomes computationally expensive very quickly. <b>Alpha-beta pruning</b> solves this by:
                </p>
                <ul>
                    <li>Keeping track of the best scores found so far (alpha and beta bounds)</li>
                    <li>Skipping branches that provably cannot affect the final decision</li>
                    <li>Reducing the number of positions evaluated by up to 50% or more</li>
                </ul>

                <h3>Heuristic Evaluation Function</h3>
                <p>
                    The strength of the AI depends heavily on how it evaluates board positions. My evaluation function considers:
                </p>
                <ul>
                    <li><b>Immediate Wins (Score: 10):</b> Creating five in a row</li>
                    <li><b>Blocking Opponent's Four (Score: 9):</b> Preventing opponent from winning next turn</li>
                    <li><b>Creating Four (Score: 7-8):</b> Four stones with open ends (nearly guaranteed win)</li>
                    <li><b>Creating/Blocking Three (Score: 4-6):</b> Building toward future threats</li>
                    <li><b>Creating Two (Score: 2):</b> Basic position building</li>
                </ul>
                <p>
                    This scoring system ensures the AI prioritizes defensive moves when threatened while aggressively building its own winning patterns.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings"><FaReact style={{ marginRight: '10px' }} />Technical Implementation</h2>

                <h3>React Architecture</h3>
                <p>
                    The game is built with React using functional components and hooks for state management:
                </p>
                <ul>
                    <li><b>RenjuGame:</b> Main component managing game state, turns, and win conditions</li>
                    <li><b>RenjuBoard:</b> Canvas-based board rendering with click handling</li>
                    <li><b>AI Module:</b> Separate JavaScript module for minimax algorithm</li>
                    <li><b>Game Logic:</b> Utilities for move validation, grid snapping, and win detection</li>
                </ul>

                <h3>Canvas Rendering</h3>
                <p>
                    Rather than using DOM elements or images, the entire board is drawn programmatically using HTML5 Canvas:
                </p>
                <ul>
                    <li><b>Wood-textured board background</b> with grid lines</li>
                    <li><b>Gradient-shaded stones</b> for realistic 3D appearance</li>
                    <li><b>Shadow effects</b> and highlights for depth</li>
                    <li><b>Star points</b> marking strategic board positions</li>
                </ul>
                <p>
                    This approach keeps the bundle size tiny (~50KB) while maintaining smooth visuals.
                </p>

                <h3>Performance Optimizations</h3>
                <p>
                    To keep the AI responsive even on slower devices, I implemented several optimizations:
                </p>
                <ul>
                    <li><b>Move Ordering:</b> Evaluating more promising moves first to improve pruning</li>
                    <li><b>Neighborhood Search:</b> Only considering moves adjacent to existing stones</li>
                    <li><b>Limited Depth:</b> Searching 4 moves ahead balances strength with speed</li>
                    <li><b>Top-N Selection:</b> Evaluating only the 10 best candidate moves at each level</li>
                </ul>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">Strategic Insights</h2>
                <p>
                    Through building and testing this AI, I discovered several interesting strategic patterns in Renju:
                </p>
                <ul>
                    <li><b>Center Control:</b> The first move should always be in the center, giving maximum opportunities</li>
                    <li><b>Double Threats:</b> Creating two simultaneous threats forces the opponent into an unwinnable position</li>
                    <li><b>Open Threes:</b> A row of three with both ends open is extremely valuable</li>
                    <li><b>Forced Moves:</b> Creating fours forces the opponent to block, controlling the game flow</li>
                </ul>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">Lessons Learned</h2>
                <p>
                    Building this project reinforced several important concepts:
                </p>
                <ul>
                    <li><b>Algorithm Design:</b> Understanding how theoretical algorithms translate to practical implementations</li>
                    <li><b>Performance Tuning:</b> Balancing AI strength with responsiveness through careful optimization</li>
                    <li><b>UI/UX Design:</b> Creating intuitive game interfaces with minimal visual elements</li>
                    <li><b>Canvas Programming:</b> Leveraging HTML5 Canvas for efficient, programmatic graphics</li>
                </ul>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">Try It Yourself</h2>
                <p>
                    The complete source code for this project is available on GitHub. You can run it locally or deploy it to any static hosting service. The game demonstrates how classic game-playing algorithms can create engaging experiences in modern web applications.
                </p>
                <p>
                    Whether you're interested in game AI, React development, or just enjoy strategic board games, I hope this project provides both entertainment and educational value. Challenge the AI and see how you stack up!
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
                        This led to the creation of Renju, which adds special rules to balance the game. However, in this simplified 
                        version, Black still has a theoretical advantage - though at depth-4 search, the game remains competitive!
                    </p>
                </div>

                <br />
            </div>
        );
    }
}
