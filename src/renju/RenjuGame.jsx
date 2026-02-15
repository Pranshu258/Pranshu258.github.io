import React, { useState, useEffect, useCallback } from 'react';
import RenjuBoard from './RenjuBoard';
import { attack, attackWithVisualization, checkWin } from './ai';
import { 
  snapToGrid, 
  isValidMove, 
  saveGame, 
  loadGame
} from './gameLogic';

function RenjuGame() {
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing', 'won', 'lost'
  const [userColor, setUserColor] = useState('black');
  const [humanMoves, setHumanMoves] = useState([]);
  const [computerMoves, setComputerMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('human');
  const [moveCount, setMoveCount] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [showResultBanner, setShowResultBanner] = useState(true);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [candidateMoves, setCandidateMoves] = useState([]);
  const [difficulty, setDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'

  const difficultyDepth = { easy: 2, medium: 4, hard: 6 };

  const handleStartGame = (color) => {
    setUserColor(color);
    setGameState('playing');
    setHumanMoves([]);
    setComputerMoves([]);
    setMoveCount(1);
    setLastMove(null);
    setShowResultBanner(true);

    // First move - Black always goes first (center of the board)
    // Grid center is at index 7: BOARD_OFFSET + 7 * GRID_SIZE = 300
    // Stored value accounts for drawing offset: 300 - GRID_SIZE/2 = 280
    const centerPos = 280;
    if (color === 'black') {
      // Human plays black, so human goes first
      setHumanMoves([[centerPos, centerPos]]);
      setLastMove([centerPos, centerPos]);
      setCurrentTurn('computer');
    } else {
      // Human plays white, so AI (black) goes first
      setComputerMoves([[centerPos, centerPos]]);
      setLastMove([centerPos, centerPos]);
      setCurrentTurn('human');
    }
  };

  const handleMove = useCallback((x, y) => {
    if (gameState !== 'playing' || currentTurn !== 'human') return;

    const gridX = snapToGrid(x);
    const gridY = snapToGrid(y);

    if (!isValidMove(gridX, gridY, humanMoves, computerMoves)) return;

    const newHumanMoves = [...humanMoves, [gridX, gridY]];
    setHumanMoves(newHumanMoves);
    setLastMove([gridX, gridY]);

    // Check win
    if (checkWin(newHumanMoves, gridX, gridY)) {
      setGameState('won');
      return;
    }

    setMoveCount(moveCount + 1);
    setCurrentTurn('computer');
  }, [gameState, currentTurn, humanMoves, computerMoves, moveCount]);

  // AI move effect
  useEffect(() => {
    if (gameState === 'playing' && currentTurn === 'computer') {
      let cancelled = false;

      const runAI = async () => {
        // Small initial delay
        await new Promise(resolve => setTimeout(resolve, 300));
        if (cancelled) return;

        const newComputerMoves = [...computerMoves];

        if (thinkingMode) {
          // Use visualization mode
          setCandidateMoves([]);
          await attackWithVisualization(
            newComputerMoves,
            humanMoves,
            difficultyDepth[difficulty],
            (move, status, score) => {
              if (cancelled) return;
              setCandidateMoves(prev => {
                const existing = prev.find(c => c.move[0] === move[0] && c.move[1] === move[1]);
                if (existing) {
                  return prev.map(c => 
                    c.move[0] === move[0] && c.move[1] === move[1]
                      ? { ...c, status, score }
                      : c
                  );
                }
                return [...prev, { move, status, score }];
              });
            }
          );
          // Clear candidates after decision
          await new Promise(resolve => setTimeout(resolve, 300));
          if (cancelled) return;
          setCandidateMoves([]);
        } else {
          // Use regular fast attack
          attack(newComputerMoves, humanMoves, 0, difficultyDepth[difficulty], -1000, 1000);
        }

        if (cancelled) return;

        if (newComputerMoves.length > computerMoves.length) {
          const aiMove = newComputerMoves[newComputerMoves.length - 1];
          setComputerMoves(newComputerMoves);
          setLastMove(aiMove);

          // Check win
          if (checkWin(newComputerMoves, aiMove[0], aiMove[1])) {
            setGameState('lost');
            return;
          }

          setMoveCount(moveCount + 1);
          setCurrentTurn('human');
        }
      };

      runAI();

      return () => { cancelled = true; };
    }
  }, [currentTurn, gameState, computerMoves, humanMoves, moveCount, thinkingMode, difficulty]);

  const handleRestart = () => {
    handleStartGame(userColor);
  };

  const handleNewColor = () => {
    setGameState('setup');
  };

  if (gameState === 'setup') {
    return (
      <div style={{
        background: 'linear-gradient(145deg, var(--blog-surface-background), #1a1a2e)',
        padding: '50px 40px',
        borderRadius: '16px',
        border: '1px solid #333',
        textAlign: 'center',
        margin: '30px 0',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{ 
          marginBottom: '10px', 
          color: 'var(--surface-text-color)',
          fontSize: '1.8em',
          fontWeight: '600'
        }}>
          Renju (Five in a Row)
        </h2>
        <p style={{ 
          color: 'var(--surface-text-color)', 
          opacity: 0.6, 
          marginBottom: '30px',
          fontSize: '0.95em'
        }}>
          Classic strategy game • Get 5 stones in a row to win
        </p>
        
        {/* Difficulty selector */}
        <div style={{ marginBottom: '35px' }}>
          <div style={{ 
            color: 'var(--surface-text-color)', 
            marginBottom: '12px',
            fontSize: '0.85em',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            opacity: 0.7
          }}>Select Difficulty</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {['easy', 'medium', 'hard'].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                style={{
                  padding: '12px 24px',
                  background: difficulty === level 
                    ? level === 'easy' ? 'linear-gradient(135deg, #4caf50, #2e7d32)'
                    : level === 'medium' ? 'linear-gradient(135deg, #ff9800, #f57c00)'
                    : 'linear-gradient(135deg, #f44336, #c62828)'
                    : 'rgba(255,255,255,0.05)',
                  border: difficulty === level ? 'none' : '1px solid #444',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95em',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: difficulty === level ? '600' : '400',
                  boxShadow: difficulty === level ? '0 4px 15px rgba(0,0,0,0.3)' : 'none',
                  transform: difficulty === level ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {level === 'easy' ? '😊 Easy' : level === 'medium' ? '🤔 Medium' : '😈 Hard'}
              </button>
            ))}
          </div>
        </div>

        {/* Stone color selector */}
        <div style={{ 
          color: 'var(--surface-text-color)', 
          marginBottom: '15px',
          fontSize: '0.85em',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          opacity: 0.7
        }}>Choose Your Stone</div>
        <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleStartGame('black')}
            style={{
              padding: '25px 35px',
              background: 'linear-gradient(145deg, #2a2a2a, #1a1a1a)',
              border: '3px solid #444',
              borderRadius: '16px',
              color: '#fff',
              fontSize: '1em',
              cursor: 'pointer',
              transition: 'all 0.3s',
              minWidth: '160px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)'; }}
          >
            <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>⚫</div>
            <div style={{ fontWeight: '600' }}>Play as Black</div>
            <small style={{ opacity: 0.6, fontSize: '0.85em' }}>You go first</small>
          </button>
          <button
            onClick={() => handleStartGame('white')}
            style={{
              padding: '25px 35px',
              background: 'linear-gradient(145deg, #ffffff, #e0e0e0)',
              border: '3px solid #ccc',
              borderRadius: '16px',
              color: '#1a1a1a',
              fontSize: '1em',
              cursor: 'pointer',
              transition: 'all 0.3s',
              minWidth: '160px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)'; }}
          >
            <div style={{ fontSize: '2.5em', marginBottom: '8px' }}>⚪</div>
            <div style={{ fontWeight: '600' }}>Play as White</div>
            <small style={{ opacity: 0.6, fontSize: '0.85em' }}>AI goes first</small>
          </button>
        </div>
      </div>
    );
  }

  const isGameOver = gameState === 'won' || gameState === 'lost';

  return (
    <div style={{
      padding: '20px 0',
      margin: '30px 0',
      position: 'relative'
    }}>
      {/* Main Layout: Board + Info Panel */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '25px' }}>
        
        {/* Board Container */}
        <div style={{ position: 'relative' }}>
          <RenjuBoard
            humanMoves={humanMoves}
            computerMoves={computerMoves}
            userColor={userColor}
            onMove={handleMove}
            disabled={gameState !== 'playing' || currentTurn !== 'human'}
            lastMove={lastMove}
            candidateMoves={candidateMoves}
          />
          
          {/* Game Result Popup - centered on board */}
          {isGameOver && showResultBanner && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: gameState === 'won' 
                ? 'linear-gradient(135deg, #1b5e20, #2e7d32)' 
                : 'linear-gradient(135deg, #b71c1c, #c62828)',
              padding: '30px 40px',
              borderRadius: '20px',
              boxShadow: '0 15px 50px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              zIndex: 100,
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '3em' }}>
                {gameState === 'won' ? '🎉' : '😔'}
              </div>
              <span style={{
                fontSize: '1.6em',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {gameState === 'won' ? 'You Won!' : 'AI Won'}
              </span>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={handleRestart}
                  style={{
                    padding: '12px 24px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '1em',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  🔄 Play Again
                </button>
                <button
                  onClick={() => setShowResultBanner(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.95em',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  View Board
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Info Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          minWidth: '160px'
        }}>
          {/* Player Info */}
          <div style={{ 
            color: 'var(--surface-text-color)',
            padding: '15px',
            background: 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: '1px solid var(--blog-surface-border, #333)'
          }}>
            <div style={{ fontSize: '0.7em', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Playing as</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.8em' }}>{userColor === 'black' ? '⚫' : '⚪'}</span>
              <span style={{ fontWeight: '600', fontSize: '1.1em' }}>{userColor === 'black' ? 'Black' : 'White'}</span>
            </div>
          </div>

          {/* Turn Status */}
          {gameState === 'playing' && (
            <div style={{ 
              padding: '12px 15px',
              background: currentTurn === 'human' 
                ? 'linear-gradient(135deg, #2196f3, #1976d2)' 
                : 'linear-gradient(135deg, #ff9800, #f57c00)',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9em',
              textAlign: 'center'
            }}>
              {currentTurn === 'human' ? '🎯 Your Turn' : '🤖 AI Thinking...'}
            </div>
          )}

          {/* Game Info */}
          <div style={{
            color: 'var(--surface-text-color)',
            padding: '12px 15px',
            background: 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: '1px solid var(--blog-surface-border, #333)',
            fontSize: '0.85em'
          }}>
            <div style={{ opacity: 0.6, marginBottom: '4px' }}>Move #{Math.ceil(moveCount / 2)}</div>
            <div style={{ fontWeight: '500' }}>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty</div>
          </div>

          {/* AI Thinking Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            background: thinkingMode ? 'rgba(33, 150, 243, 0.15)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: thinkingMode ? '1px solid rgba(33, 150, 243, 0.5)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s'
          }}>
            <input
              type="checkbox"
              checked={thinkingMode}
              onChange={(e) => setThinkingMode(e.target.checked)}
              style={{ 
                cursor: 'pointer',
                width: '14px',
                height: '14px',
                accentColor: '#2196f3',
                margin: 0
              }}
            />
            <span>🧠 Show AI</span>
          </label>

          {/* Action Buttons */}
          <button
            onClick={handleRestart}
            style={{
              padding: '12px 15px',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
          >
            🔄 Restart
          </button>
          
          <button
            onClick={handleNewColor}
            style={{
              padding: '12px 15px',
              background: 'transparent',
              border: '1px solid var(--blog-surface-border, #ccc)',
              borderRadius: '10px',
              color: 'var(--surface-text-color)',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ New Game
          </button>

          {/* Help Text */}
          <div style={{ 
            color: 'var(--surface-text-color)',
            opacity: 0.5,
            fontSize: '0.8em',
            textAlign: 'center',
            marginTop: '5px'
          }}>
            Get 5 in a row to win
          </div>
        </div>
      </div>
    </div>
  );
}

export default RenjuGame;
