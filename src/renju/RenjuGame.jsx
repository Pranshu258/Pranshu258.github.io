import React, { useState, useEffect, useCallback, useRef } from 'react';
import RenjuBoard from './RenjuBoard';
import { attack, attackWithVisualization, checkWin, getWinningLine, clearTranspositionTable } from './ai';
import { 
  snapToGrid, 
  isValidMove, 
  saveGame, 
  loadGame
} from './gameLogic';

// Sound effects using Web Audio API
const createAudioContext = () => {
  return new (window.AudioContext || window.webkitAudioContext)();
};

const playStoneSound = (audioContext) => {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const playWinSound = (audioContext) => {
  if (!audioContext) return;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    const startTime = audioContext.currentTime + i * 0.12;
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.3);
  });
};

const playLoseSound = (audioContext) => {
  if (!audioContext) return;
  const notes = [392, 330, 262]; // G4, E4, C4
  notes.forEach((freq, i) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    const startTime = audioContext.currentTime + i * 0.2;
    gainNode.gain.setValueAtTime(0.2, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.4);
  });
};

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
  const [currentDepth, setCurrentDepth] = useState(null);
  const [maxDepth, setMaxDepth] = useState(6); // Adaptive difficulty: increases on player win, decreases on loss
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);

  // Initialize audio context on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Random depth for each AI move (1 to maxDepth)
  const getRandomDepth = () => {
    return Math.floor(Math.random() * maxDepth) + 1;
  };

  // Adjust difficulty based on game outcome
  useEffect(() => {
    if (gameState === 'won') {
      // Player won - increase difficulty (cap at 10)
      setMaxDepth(prev => Math.min(prev + 1, 10));
      if (soundEnabled) playWinSound(audioContextRef.current);
    } else if (gameState === 'lost') {
      // Player lost - decrease difficulty (floor at 2)
      setMaxDepth(prev => Math.max(prev - 1, 2));
      if (soundEnabled) playLoseSound(audioContextRef.current);
    }
  }, [gameState, soundEnabled]);

  const handleStartGame = (color) => {
    ensureAudioContext();
    setUserColor(color);
    setGameState('playing');
    setHumanMoves([]);
    setComputerMoves([]);
    setMoveCount(1);
    setLastMove(null);
    setWinningLine(null);
    setCurrentDepth(null);
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
    if (soundEnabled) playStoneSound(audioContextRef.current);

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
        const depth = getRandomDepth();
        setCurrentDepth(depth);

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
          if (soundEnabled) playStoneSound(audioContextRef.current);

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
            fontSize: '0.85em'
          }}>
            <div style={{ fontWeight: '500', textAlign: 'center', marginBottom: '8px' }}>Move #{Math.ceil(moveCount / 2)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8 }}>
              <span>Max Depth:</span>
              <span style={{ fontWeight: '500' }}>{maxDepth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Current Depth:</span>
              <span style={{ fontWeight: '500' }}>{currentDepth ?? '—'}</span>
            </div>
          </div>

          {/* AI Thinking Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '12px',
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
            <span style={{ lineHeight: '1.3' }}>Visualize AI Analysis</span>
          </label>

          {/* Sound Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            background: soundEnabled ? 'rgba(34, 197, 94, 0.12)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: soundEnabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '36px',
              height: '20px',
              background: soundEnabled ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'var(--blog-surface-border, #555)',
              borderRadius: '10px',
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: soundEnabled ? '0 2px 8px rgba(34, 197, 94, 0.3)' : 'none'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: soundEnabled ? '18px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ lineHeight: '1' }}>{soundEnabled ? '🔊' : '🔇'} Sound</span>
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
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>🔄</span><span>Restart</span>
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
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>⚙️</span><span>New Game</span>
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
