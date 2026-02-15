import React, { useState, useEffect, useCallback } from 'react';
import RenjuBoard from './RenjuBoard';
import { attack, attackWithVisualization, checkWin, getWinningLine, clearTranspositionTable } from './ai';
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
  const [thinkingMode, setThinkingMode] = useState(false);
  const [candidateMoves, setCandidateMoves] = useState([]);
  const [winningLine, setWinningLine] = useState(null);

  // Random depth for each AI move
  // When human plays black (human has first-move advantage): AI searches deeper (4-6) to compensate
  // When human plays white (AI has first-move advantage): AI searches shallower (2-6) to balance
  const getRandomDepth = (humanColor) => {
    if (humanColor === 'black') {
      return Math.floor(Math.random() * 4) + 3; // 3-6 (harder AI)
    }
    return Math.floor(Math.random() * 4) + 2; // 2-5 (easier AI)
  };

  const handleStartGame = (color) => {
    setUserColor(color);
    setGameState('playing');
    setHumanMoves([]);
    setComputerMoves([]);
    setMoveCount(1);
    setLastMove(null);
    setWinningLine(null);
    clearTranspositionTable(); // Clear cached positions for new game

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
      setWinningLine(getWinningLine(newHumanMoves, gridX, gridY));
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
        const depth = getRandomDepth(userColor);

        if (thinkingMode) {
          // Use visualization mode
          setCandidateMoves([]);
          const result = await attackWithVisualization(
            newComputerMoves,
            humanMoves,
            depth,
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
          // Add the best move to our array
          if (result.bestMove) {
            newComputerMoves.push(result.bestMove);
          }
          // Clear candidates after decision
          await new Promise(resolve => setTimeout(resolve, 300));
          if (cancelled) return;
          setCandidateMoves([]);
        } else {
          // Use regular fast attack
          const result = attack(newComputerMoves, humanMoves, 0, depth, -1000, 1000);
          if (result.bestMove) {
            newComputerMoves.push(result.bestMove);
          }
        }

        if (cancelled) return;

        if (newComputerMoves.length > computerMoves.length) {
          const aiMove = newComputerMoves[newComputerMoves.length - 1];
          setComputerMoves(newComputerMoves);
          setLastMove(aiMove);

          // Check win
          if (checkWin(newComputerMoves, aiMove[0], aiMove[1])) {
            setWinningLine(getWinningLine(newComputerMoves, aiMove[0], aiMove[1]));
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
  }, [currentTurn, gameState, computerMoves, humanMoves, moveCount, thinkingMode]);

  const handleRestart = () => {
    handleStartGame(userColor);
  };

  const handleNewColor = () => {
    setGameState('setup');
  };

  if (gameState === 'setup') {
    return (
      <div style={{
        padding: '20px 0',
        margin: '30px 0',
        position: 'relative'
      }}>
        {/* Main Layout: Board + Setup Panel */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '25px' }}>
          
          {/* Board Preview */}
          <div style={{ position: 'relative', width: '600px', flexShrink: 0 }}>
            <RenjuBoard
              humanMoves={[]}
              computerMoves={[]}
              userColor="black"
              onMove={() => {}}
              disabled={true}
              lastMove={null}
              candidateMoves={[]}
            />
            {/* Setup Overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.7)',
              padding: '20px 30px',
              borderRadius: '12px',
              color: '#fff',
              textAlign: 'center',
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{ fontSize: '1.4em', fontWeight: '600', marginBottom: '5px' }}>
                Renju
              </div>
              <div style={{ opacity: 0.7, fontSize: '0.9em' }}>
                Select options to start →
              </div>
            </div>
          </div>

          {/* Right Setup Panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            width: '180px',
            flexShrink: 0
          }}>
            {/* Title */}
            <div style={{ 
              color: 'var(--surface-text-color)',
              padding: '15px',
              background: 'var(--blog-surface-background)',
              borderRadius: '10px',
              border: '1px solid var(--blog-surface-border, #333)'
            }}>
              <div style={{ fontWeight: '600', fontSize: '1.1em', marginBottom: '4px' }}>New Game</div>
              <div style={{ opacity: 0.6, fontSize: '0.8em' }}>Get 5 in a row to win</div>
            </div>

            {/* Stone Color Selector */}
            <div style={{
              color: 'var(--surface-text-color)',
              padding: '12px 15px',
              background: 'var(--blog-surface-background)',
              borderRadius: '10px',
              border: '1px solid var(--blog-surface-border, #333)'
            }}>
              <div style={{ fontSize: '0.7em', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Play As</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleStartGame('black')}
                  style={{
                    padding: '14px 15px',
                    background: 'linear-gradient(145deg, #2d2d2d, #1f1f1f)',
                    border: '2px solid #404040',
                    borderRadius: '10px',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  <span style={{ fontSize: '1.6em' }}>⚫</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95em' }}>Black</div>
                    <div style={{ opacity: 0.6, fontSize: '0.75em' }}>You go first</div>
                  </div>
                </button>
                <button
                  onClick={() => handleStartGame('white')}
                  style={{
                    padding: '14px 15px',
                    background: 'linear-gradient(145deg, #fafafa, #eeeeee)',
                    border: '2px solid #d4d4d4',
                    borderRadius: '10px',
                    color: '#262626',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <span style={{ fontSize: '1.6em' }}>⚪</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.95em' }}>White</div>
                    <div style={{ opacity: 0.6, fontSize: '0.75em' }}>AI goes first</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div style={{ 
              color: 'var(--surface-text-color)',
              opacity: 0.5,
              fontSize: '0.8em',
              textAlign: 'center',
              marginTop: '5px'
            }}>
              Click a stone to start
            </div>
          </div>
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
        <div style={{ position: 'relative', width: '600px', flexShrink: 0 }}>
          <RenjuBoard
            humanMoves={humanMoves}
            computerMoves={computerMoves}
            userColor={userColor}
            onMove={handleMove}
            disabled={gameState !== 'playing' || currentTurn !== 'human'}
            lastMove={lastMove}
            candidateMoves={candidateMoves}
            winningLine={winningLine}
          />
        </div>

        {/* Right Info Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '180px',
          flexShrink: 0
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
                ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9em',
              textAlign: 'center',
              boxShadow: currentTurn === 'human' 
                ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                : '0 4px 14px rgba(245, 158, 11, 0.35)'
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
            fontSize: '0.85em',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '500' }}>Move #{Math.ceil(moveCount / 2)}</div>
          </div>

          {/* AI Thinking Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            background: thinkingMode ? 'rgba(99, 102, 241, 0.12)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: thinkingMode ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <input
              type="checkbox"
              checked={thinkingMode}
              onChange={(e) => setThinkingMode(e.target.checked)}
              style={{ 
                display: 'none'
              }}
            />
            <div style={{
              width: '36px',
              height: '20px',
              background: thinkingMode ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--blog-surface-border, #555)',
              borderRadius: '10px',
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: thinkingMode ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: thinkingMode ? '18px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span>Visualize AI Analysis</span>
          </label>

          {/* Action Buttons */}
          <button
            onClick={handleRestart}
            style={{
              padding: '12px 15px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9em',
              fontWeight: '500',
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
              width: '100%',
              boxSizing: 'border-box'
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
              transition: 'all 0.2s',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            ⚙️ New Game
          </button>

          {/* Game Result or Help Text */}
          {isGameOver ? (
            <div style={{
              padding: '15px',
              background: gameState === 'won' 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderRadius: '10px',
              textAlign: 'center',
              boxShadow: gameState === 'won'
                ? '0 4px 14px rgba(16, 185, 129, 0.35)'
                : '0 4px 14px rgba(239, 68, 68, 0.35)'
            }}>
              <div style={{ fontSize: '1.5em', marginBottom: '6px' }}>
                {gameState === 'won' ? '🎉' : '😔'}
              </div>
              <div style={{
                color: '#fff',
                fontWeight: '600',
                fontSize: '1em'
              }}>
                {gameState === 'won' ? 'You Won!' : 'AI Won'}
              </div>
            </div>
          ) : (
            <div style={{ 
              color: 'var(--surface-text-color)',
              opacity: 0.5,
              fontSize: '0.8em',
              textAlign: 'center',
              marginTop: '5px'
            }}>
              Get 5 in a row to win
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RenjuGame;
