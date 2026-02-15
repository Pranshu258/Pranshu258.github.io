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
                    The AI uses a depth-4 minimax search with alpha-beta pruning, making it a challenging opponent. Choose your stone color and see if you can beat it!
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

                <h2 className="headings">Source Code</h2>
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
