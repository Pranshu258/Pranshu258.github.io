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
                    Renju, also known as "Five in a Row" or Gomoku, is a classic strategic board game  that has been played for centuries across Asia and beyond. In this project, I built a modern web implementation of Renju using React, complete with an AI opponent powered by the minimax algorithm with alpha-beta pruning. The result is a clean, minimalist game that runs entirely in the browser with no external dependencies.
                </p>

                <hr style={{ backgroundColor: "white" }}></hr>

                <h2 className="headings">Play the Game</h2>
                <p>
                    The AI uses minimax search with alpha-beta pruning, randomizing its search depth between 2-8 for each move. This creates a dynamic and unpredictable opponent that varies in strength throughout the game. Choose your stone color and see if you can beat it!
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
                        version, Black still has a theoretical advantage - though with randomized search depths (2-8), the AI provides an unpredictable challenge!
                    </p>
                </div>
                <br></br>
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
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                    </svg>
                    View Source on GitHub
                </a>
                                <hr style={{ backgroundColor: "white" }}></hr>


                <br />
            </div>
        );
    }
}
