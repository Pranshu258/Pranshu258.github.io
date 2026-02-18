import React, { useState, useEffect, useCallback, useRef } from 'react';
import RenjuBoard from './RenjuBoard';
import { attack, attackWithVisualization, checkWin, checkWinRenju, getWinningLine, clearTranspositionTable, getMovesOptimized } from './ai';
import { 
  snapToGrid, 
  isValidMove, 
  saveGame, 
  loadGame
} from './gameLogic';
import { getLLMMove, toNotation } from './llm';

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

const DIFFICULTY_PRESETS = {
  easy: { depth: 1, mistakeRate: 0.4, label: 'Easy', emoji: '🌱' },
  medium: { depth: 2, mistakeRate: 0.15, label: 'Medium', emoji: '⚔️' },
  hard: { depth: 4, mistakeRate: 0, label: 'Hard', emoji: '🔥' },
  adaptive: { depth: 1, mistakeRate: 0, label: 'Adaptive', emoji: '🧠', adaptive: true },
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
  const [maxDepth, setMaxDepth] = useState(1); // Adaptive difficulty: 30% chance to increase on player win, decreases on loss
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameMode, setGameMode] = useState('pvai'); // 'pvai' = Player vs AI, 'aivsllm' = AI vs LLM
  const [llmConfig, setLlmConfig] = useState({ endpoint: '', deploymentName: '', apiKey: '', apiVersion: '2024-02-01' });
  const [llmLog, setLlmLog] = useState([]); // move log for AI vs LLM
  const [llmError, setLlmError] = useState(null);
  const [aiVsLlmRunning, setAiVsLlmRunning] = useState(false);
  const [threatHints, setThreatHints] = useState(true);
  const [difficulty, setDifficulty] = useState('easy');
  const aiVsLlmCancelRef = useRef(false);
  const audioContextRef = useRef(null);

  // Initialize audio context on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Depth for each AI move based on difficulty
  const getRandomDepth = () => {
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (preset && !preset.adaptive) {
      return preset.depth;
    }
    return Math.floor(Math.random() * maxDepth) + 1;
  };

  // Adjust difficulty based on game outcome
  // In pvai: won = player won → harder, lost = AI won → easier
  // In aivsllm: LLM replaces human, so won = local AI won → easier, lost = LLM won → harder
  useEffect(() => {
    if (gameState === 'won') {
      if (gameMode === 'aivsllm') {
        setMaxDepth(prev => Math.max(prev - 1, 1));
      } else if (difficulty === 'adaptive') {
        if (Math.random() < 0.3) {
          setMaxDepth(prev => Math.min(prev + 1, 10));
        }
      }
      if (soundEnabled) playWinSound(audioContextRef.current);
    } else if (gameState === 'lost') {
      if (gameMode === 'aivsllm') {
        setMaxDepth(prev => Math.min(prev + 1, 10));
      } else if (difficulty === 'adaptive') {
        setMaxDepth(prev => Math.max(prev - 1, 1));
      }
      if (soundEnabled) playLoseSound(audioContextRef.current);
    }
  }, [gameState, soundEnabled, gameMode, difficulty]);

  const handleStartGame = (color) => {
    ensureAudioContext();
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (preset && !preset.adaptive) {
      setMaxDepth(preset.depth);
    } else {
      setMaxDepth(1);
    }
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
    if (gameMode !== 'aivsllm' && gameState === 'playing' && currentTurn === 'computer') {
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
          // AI is Black if user chose White
          const aiIsBlack = userColor === 'white';
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
            },
            aiIsBlack
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
          // AI is Black if user chose White
          const aiIsBlack = userColor === 'white';
          const result = attack(newComputerMoves, humanMoves, 0, depth, -1000, 1000, aiIsBlack);
          let moveToPlay = result.bestMove;

          // Difficulty-based mistakes: occasionally pick a weaker move
          const preset = DIFFICULTY_PRESETS[difficulty];
          if (preset && preset.mistakeRate && moveToPlay && Math.random() < preset.mistakeRate) {
            const candidates = getMovesOptimized(newComputerMoves, humanMoves, aiIsBlack);
            if (candidates.length > 2) {
              const weakerHalf = candidates.slice(Math.floor(candidates.length / 2));
              moveToPlay = weakerHalf[Math.floor(Math.random() * weakerHalf.length)];
            }
          }

          if (moveToPlay) {
            newComputerMoves.push(moveToPlay);
          }
        }

        if (cancelled) return;

        if (newComputerMoves.length > computerMoves.length) {
          const aiMove = newComputerMoves[newComputerMoves.length - 1];
          setComputerMoves(newComputerMoves);
          setLastMove(aiMove);
          if (soundEnabled) playStoneSound(audioContextRef.current);

          // Check win - use Renju rules if AI is Black (overline doesn't win)
          const aiIsBlack = userColor === 'white';
          const aiWon = aiIsBlack 
            ? checkWinRenju(newComputerMoves, aiMove[0], aiMove[1], true)
            : checkWin(newComputerMoves, aiMove[0], aiMove[1]);
          if (aiWon) {
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
  }, [currentTurn, gameState, gameMode, computerMoves, humanMoves, moveCount, thinkingMode]);

  const handleRestart = () => {
    if (gameMode === 'aivsllm') {
      handleStartAiVsLlm();
    } else {
      handleStartGame(userColor);
    }
  };

  // ============================================================
  // AI vs LLM Mode
  // ============================================================
  const handleStartAiVsLlm = () => {
    ensureAudioContext();
    aiVsLlmCancelRef.current = false;
    setGameMode('aivsllm');
    setGameState('playing');
    setHumanMoves([]); // repurposed: Black moves (LLM)
    setComputerMoves([]); // repurposed: White moves (local AI)
    setMoveCount(1);
    setLastMove(null);
    setWinningLine(null);
    setCurrentDepth(null);
    setLlmLog([]);
    setLlmError(null);
    setAiVsLlmRunning(true);
    clearTranspositionTable();

    // LLM (Black) goes first — start the loop
    setCurrentTurn('human'); // LLM's turn first
  };

  // Auto-play loop for AI vs LLM
  useEffect(() => {
    if (gameMode !== 'aivsllm' || gameState !== 'playing' || !aiVsLlmRunning) return;

    let cancelled = false;
    aiVsLlmCancelRef.current = false;

    const runLoop = async () => {
      let blackMoves = [...humanMoves]; // LLM plays Black
      let whiteMoves = [...computerMoves]; // Local AI plays White
      let turn = currentTurn; // 'human' = LLM-Black, 'computer' = AI-White
      let moves = moveCount;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelled || aiVsLlmCancelRef.current) return;
        await new Promise(r => setTimeout(r, 600));
        if (cancelled || aiVsLlmCancelRef.current) return;

        if (turn === 'human') {
          // LLM (Black) turn
          setCurrentTurn('human');
          const allMoves = [...blackMoves, ...whiteMoves];
          const result = await getLLMMove(llmConfig, blackMoves, whiteMoves, 'black', allMoves, 3, threatHints);

          if (cancelled || aiVsLlmCancelRef.current) return;

          if (!result.move) {
            setLlmError(result.error || 'LLM failed to produce a valid move');
            setAiVsLlmRunning(false);
            return;
          }

          blackMoves = [...blackMoves, result.move];
          setHumanMoves([...blackMoves]);
          setLastMove(result.move);
          if (soundEnabled) playStoneSound(audioContextRef.current);
          setLlmLog(prev => [...prev, { turn: moves, player: 'LLM (Black)', notation: toNotation(...result.move), raw: result.raw }]);

          if (checkWinRenju(blackMoves, result.move[0], result.move[1], true)) {
            setWinningLine(getWinningLine(blackMoves, result.move[0], result.move[1]));
            setGameState('lost'); // LLM won
            setAiVsLlmRunning(false);
            return;
          }

          moves++;
          setMoveCount(moves);
          turn = 'computer';
        } else {
          // Local AI (White) turn
          setCurrentTurn('computer');
          const depth = Math.floor(Math.random() * maxDepth) + 1;
          setCurrentDepth(depth);

          let bestMove = null;

          if (thinkingMode) {
            setCandidateMoves([]);
            const result = await attackWithVisualization(
              [...whiteMoves],
              [...blackMoves],
              depth,
              (move, status, score) => {
                if (cancelled || aiVsLlmCancelRef.current) return;
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
              },
              false // AI is White
            );
            bestMove = result.bestMove;
            await new Promise(r => setTimeout(r, 300));
            if (cancelled || aiVsLlmCancelRef.current) return;
            setCandidateMoves([]);
          } else {
            const result = attack([...whiteMoves], [...blackMoves], 0, depth, -1000, 1000, false);
            bestMove = result.bestMove;
          }

          if (cancelled || aiVsLlmCancelRef.current) return;

          if (!bestMove) {
            setLlmError('Local AI failed to find a move');
            setAiVsLlmRunning(false);
            return;
          }

          whiteMoves = [...whiteMoves, bestMove];
          setComputerMoves([...whiteMoves]);
          setLastMove(bestMove);
          if (soundEnabled) playStoneSound(audioContextRef.current);
          setLlmLog(prev => [...prev, { turn: moves, player: 'AI (White)', notation: toNotation(...bestMove) }]);

          if (checkWin(whiteMoves, bestMove[0], bestMove[1])) {
            setWinningLine(getWinningLine(whiteMoves, bestMove[0], bestMove[1]));
            setGameState('won'); // Local AI won
            setAiVsLlmRunning(false);
            return;
          }

          moves++;
          setMoveCount(moves);
          turn = 'human';
        }
      }
    };

    runLoop();

    return () => {
      cancelled = true;
      aiVsLlmCancelRef.current = true;
    };
  }, [aiVsLlmRunning]); // Only re-run when aiVsLlmRunning changes

  const handleStopAiVsLlm = () => {
    aiVsLlmCancelRef.current = true;
    setAiVsLlmRunning(false);
  };

  const handleNewColor = () => {
    aiVsLlmCancelRef.current = true;
    setAiVsLlmRunning(false);
    setGameState('setup');
  };

  if (gameState === 'setup') {
    return (
      <div style={{
        padding: '20px 0',
        margin: '20px 0',
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
              left: 0,
              right: 0,
              transform: 'translateY(-50%)',
              background: 'rgba(0, 0, 0, 0.85)',
              padding: '36px 20px',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ 
                fontSize: '2.2em', 
                fontWeight: '600', 
                letterSpacing: '8px',
                textTransform: 'uppercase',
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Renju
              </div>
              <div style={{ 
                fontSize: '0.85em', 
                color: '#94a3b8', 
                marginBottom: '16px',
                fontWeight: '500'
              }}>
                Five in a row wins
              </div>
              {/* Difficulty Selector */}
              <div style={{ 
                display: 'flex', 
                gap: '6px', 
                justifyContent: 'center', 
                marginBottom: '14px' 
              }}>
                {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    style={{
                      padding: '5px 12px',
                      background: difficulty === key 
                        ? 'rgba(99, 102, 241, 0.85)' 
                        : 'rgba(255, 255, 255, 0.08)',
                      border: difficulty === key 
                        ? '1px solid rgba(99, 102, 241, 0.9)' 
                        : '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '20px',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.75em',
                      fontWeight: difficulty === key ? '600' : '400',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
              <div style={{
                fontSize: '0.8em',
                color: '#fff',
                marginBottom: '20px',
                fontWeight: '500',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                borderRadius: '6px',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <span>👇</span>
                <span>Choose your side to begin</span>
              </div>
              
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setGameMode('pvai'); handleStartGame('black'); }}
                  style={{
                    padding: '20px 32px',
                    background: '#1a1a1a',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                    minWidth: '160px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)';
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #4a4a4a, #000)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)'
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '1em' }}>Black</div>
                    <div style={{ opacity: 0.5, fontSize: '0.75em' }}>You play first</div>
                  </div>
                </button>
                <button
                  onClick={() => { setGameMode('pvai'); handleStartGame('white'); }}
                  style={{
                    padding: '20px 32px',
                    background: '#f5f5f5',
                    border: 'none',
                    borderRadius: '16px',
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                    minWidth: '160px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)';
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, #fff, #d4d4d4)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.05)'
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '1em' }}>White</div>
                    <div style={{ opacity: 0.5, fontSize: '0.75em' }}>AI plays first</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right Setup Panel */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '12px',
            width: '220px',
            flexShrink: 0,
            alignSelf: 'stretch'
          }}>
            {/* Game Info Card */}
            <div style={{ 
              color: 'var(--surface-text-color)',
              padding: '18px',
              background: 'var(--blog-surface-background)',
              borderRadius: '12px',
              border: '1px solid var(--blog-surface-border, #333)'
            }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '1em', 
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📖</span> How to Play
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '10px',
                fontSize: '0.8em',
                opacity: 0.8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.7 }}>⚫</span>
                  <span>Black moves first</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.7 }}>🎯</span>
                  <span>Get 5 in a row to win</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ opacity: 0.7 }}>🤖</span>
                  <span>AI adapts to your skill</span>
                </div>
              </div>
            </div>

            {/* Azure AI Config Card */}
            <div style={{ 
              color: 'var(--surface-text-color)',
              padding: '18px',
              background: 'var(--blog-surface-background)',
              borderRadius: '12px',
              border: '1px solid var(--blog-surface-border, #333)',
              marginTop: 'auto'
            }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.95em', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>☁️</span> Azure AI Config
              </div>
              <div style={{ fontSize: '0.75em', opacity: 0.6, marginBottom: '10px' }}>
                Required for AI vs LLM mode
              </div>
              {[
                { key: 'endpoint', label: 'Endpoint', placeholder: 'https://....openai.azure.com' },
                { key: 'apiKey', label: 'API Key', placeholder: 'your-api-key', type: 'password' },
                { key: 'deploymentName', label: 'Deployment', placeholder: 'deployment' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.75em', opacity: 0.7, marginBottom: '3px' }}>{label}</div>
                  <input
                    type={type || 'text'}
                    value={llmConfig[key]}
                    onChange={(e) => setLlmConfig(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: '0.8em',
                      borderRadius: '6px',
                      border: '1px solid var(--blog-surface-border, #444)',
                      background: 'var(--blog-surface-background, #1a1a1a)',
                      color: 'var(--surface-text-color)',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  if (!llmConfig.endpoint || !llmConfig.apiKey) {
                    setLlmError('Enter endpoint & API key above');
                    return;
                  }
                  setLlmError(null);
                  handleStartAiVsLlm();
                }}
                style={{
                  marginTop: '6px',
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  width: '100%',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  minHeight: '40px'
                }}
              >
                <span>🤖</span><span>Start AI vs LLM</span>
              </button>
              {llmError && !aiVsLlmRunning && gameState === 'setup' && (
                <div style={{ marginTop: '8px', color: '#f87171', fontSize: '0.75em' }}>
                  {llmError}
                </div>
              )}
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
      margin: '20px 0',
      position: 'relative'
    }}>
      {/* Main Layout: Board + Info Panel */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '25px' }}>
        
        {/* Board Container */}
        <div style={{ position: 'relative', width: '600px', flexShrink: 0 }}>
          <RenjuBoard
            humanMoves={humanMoves}
            computerMoves={computerMoves}
            userColor={gameMode === 'aivsllm' ? 'black' : userColor}
            onMove={handleMove}
            disabled={gameMode === 'aivsllm' || gameState !== 'playing' || currentTurn !== 'human'}
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
          flexShrink: 0,
          alignSelf: 'stretch'
        }}>
          {/* Player Info */}
          <div style={{ 
            color: 'var(--surface-text-color)',
            padding: '15px',
            background: 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: '1px solid var(--blog-surface-border, #333)'
          }}>
            {gameMode === 'aivsllm' ? (
              <>
                <div style={{ fontSize: '0.7em', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Mode</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(circle at 30% 30%, #fff, #d4d4d4)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
                  }} />
                  <span style={{ fontWeight: '600' }}>AI</span>
                  <span style={{ opacity: 0.4, fontSize: '0.85em' }}>vs</span>
                  <span style={{ fontWeight: '600' }}>LLM</span>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                    background: 'radial-gradient(circle at 30% 30%, #4a4a4a, #000)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                  }} />
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.7em', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Playing as</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.8em' }}>{userColor === 'black' ? '⚫' : '⚪'}</span>
                  <span style={{ fontWeight: '600', fontSize: '1.1em' }}>{userColor === 'black' ? 'Black' : 'White'}</span>
                </div>
              </>
            )}
          </div>

          {/* Turn Status */}
          {gameState === 'playing' && (
            <div style={{ 
              padding: '12px 15px',
              background: gameMode === 'aivsllm'
                ? (currentTurn === 'human'
                    ? 'linear-gradient(135deg, #1a1a1a, #333)'
                    : 'linear-gradient(135deg, #6366f1, #4f46e5)')
                : (currentTurn === 'human' 
                    ? 'linear-gradient(135deg, #6366f1, #4f46e5)' 
                    : 'linear-gradient(135deg, #f59e0b, #d97706)'),
              borderRadius: '10px',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.9em',
              textAlign: 'center',
              boxShadow: currentTurn === 'human' 
                ? '0 4px 14px rgba(99, 102, 241, 0.35)'
                : '0 4px 14px rgba(245, 158, 11, 0.35)'
            }}>
              {gameMode === 'aivsllm'
                ? (currentTurn === 'human' ? '☁️ LLM thinking...' : '⚫ AI thinking...')
                : (currentTurn === 'human' ? '🎯 Your Turn' : '🤖 AI Thinking...')}
            </div>
          )}

          {/* Game Result */}
          {isGameOver && (
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
                {gameMode === 'aivsllm'
                  ? (gameState === 'won' ? 'Local AI Won!' : 'LLM Won!')
                  : (gameState === 'won' ? 'You Won!' : 'AI Won')}
              </div>
            </div>
          )}

          {/* LLM Error */}
          {llmError && gameMode === 'aivsllm' && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '10px',
              color: '#f87171',
              fontSize: '0.78em',
              wordBreak: 'break-word'
            }}>
              {llmError}
            </div>
          )}

          {/* Action Buttons - Bottom aligned */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
              gap: '6px',
              minHeight: '44px'
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
              gap: '6px',
              minHeight: '44px'
            }}
          >
            <span>⚙️</span><span>New Game</span>
          </button>

          {/* Sound Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '6px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            margin: 0,
            background: soundEnabled ? 'rgba(34, 197, 94, 0.12)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: soundEnabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '44px'
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

          {/* AI Thinking Toggle */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '6px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            margin: 0,
            background: thinkingMode ? 'rgba(99, 102, 241, 0.12)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: thinkingMode ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '44px'
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
              margin: '0px',
              boxShadow: thinkingMode ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                margin: '0px',
                top: '2px',
                left: thinkingMode ? '18px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ lineHeight: '1.3' }}>Visualize AI</span>
          </label>

          {/* Threat Hints Toggle (AI vs LLM only) */}
          {gameMode === 'aivsllm' && (
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '6px',
            cursor: 'pointer',
            color: 'var(--surface-text-color)',
            fontSize: '0.85em',
            padding: '12px 15px',
            margin: 0,
            background: threatHints ? 'rgba(245, 158, 11, 0.12)' : 'var(--blog-surface-background)',
            borderRadius: '10px',
            border: threatHints ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--blog-surface-border, #333)',
            transition: 'all 0.2s',
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '44px'
          }}>
            <input
              type="checkbox"
              checked={threatHints}
              onChange={(e) => setThreatHints(e.target.checked)}
              style={{ display: 'none' }}
            />
            <div style={{
              width: '36px',
              height: '20px',
              background: threatHints ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--blog-surface-border, #555)',
              borderRadius: '10px',
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: threatHints ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                background: '#fff',
                borderRadius: '50%',
                position: 'absolute',
                top: '2px',
                left: threatHints ? '18px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }} />
            </div>
            <span style={{ lineHeight: '1.3' }}>Threat Hints</span>
          </label>
          )}
          </div>

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
              <span>Difficulty:</span>
              <span style={{ fontWeight: '500' }}>{DIFFICULTY_PRESETS[difficulty]?.emoji} {DIFFICULTY_PRESETS[difficulty]?.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Max Depth:</span>
              <span style={{ fontWeight: '500' }}>{maxDepth}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Current Depth:</span>
              <span style={{ fontWeight: '500' }}>{currentDepth ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RenjuGame;
