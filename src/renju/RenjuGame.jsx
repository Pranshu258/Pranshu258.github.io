import React, { useState, useEffect, useCallback, useRef } from 'react';
import RenjuBoard from './RenjuBoard';
import { attack, attackWithVisualization, checkWin, checkWinRenju, getWinningLine, clearTranspositionTable, getMovesOptimized } from './ai';
import { 
  snapToGrid, 
  isValidMove, 
  saveGame, 
  loadGame
} from './gameLogic';
import { getAPIMove, WEBLLM_MODELS, loadWebLLMModel, getWebLLMMove, isWebLLMLoaded, getWebLLMLoadedModel } from './llm';
import { loadModel as loadNNModel, getNNMove, isModelLoaded as isNNModelLoaded } from './nnai';
import { TbMessageChatbot } from 'react-icons/tb';

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

function RenjuGame({ mode = 'pvai' }) {
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
  const [gameMode, setGameMode] = useState(mode);
  const [apiConfig, setApiConfig] = useState({ endpoint: 'http://localhost:12434/engines/llama.cpp/v1/chat/completions', model: 'ai/mistral', apiKey: '' });
  const [llmError, setLlmError] = useState(null);

  const [difficulty, setDifficulty] = useState('easy');
  const [opponentType, setOpponentType] = useState('ai'); // 'ai' | 'nn' | 'webllm' | 'api'
  const [webllmModel, setWebllmModel] = useState(WEBLLM_MODELS[0].id);
  const [webllmLoading, setWebllmLoading] = useState(false);
  const [webllmProgress, setWebllmProgress] = useState({ text: '', progress: 0 });
  const audioContextRef = useRef(null);

  // Neural network AI model state
  const [nnModelStatus, setNnModelStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [nnModelProgress, setNnModelProgress] = useState(0);
  const [nnModelError, setNnModelError] = useState(null);

  // Human-vs-NN game recorder: collects (board_state, human_move) pairs for training
  const pvnnRecorder = useRef({ currentGame: null, finishedGames: [] });
  const [pvnnGamesRecorded, setPvnnGamesRecorded] = useState(0);

  // Initialize audio context on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Load the ONNX model when the user selects Neural AI as their opponent
  useEffect(() => {
    if (opponentType !== 'nn') return;
    if (nnModelStatus !== 'idle') return;
    setNnModelStatus('loading');
    loadNNModel(fraction => setNnModelProgress(fraction))
      .then(() => setNnModelStatus('ready'))
      .catch(err => {
        setNnModelStatus('error');
        setNnModelError(err.message || String(err));
      });
  }, [opponentType]); // eslint-disable-line react-hooks/exhaustive-deps

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
  useEffect(() => {
    if (gameState === 'won') {
      if (difficulty === 'adaptive') {
        if (Math.random() < 0.5) {
          setMaxDepth(prev => Math.min(prev + 1, 10));
        }
      }
      if (soundEnabled) playWinSound(audioContextRef.current);
    } else if (gameState === 'lost') {
      if (difficulty === 'adaptive') {
        setMaxDepth(prev => Math.max(prev - 1, 1));
      }
      if (soundEnabled) playLoseSound(audioContextRef.current);
    }
  }, [gameState, soundEnabled, difficulty]);

  const handleStartGame = (color, startMode = 'pvai') => {
    ensureAudioContext();
    const preset = DIFFICULTY_PRESETS[difficulty];
    if (preset && !preset.adaptive) {
      setMaxDepth(preset.depth);
    } else {
      setMaxDepth(1);
    }
    setUserColor(color);
    setGameMode(startMode);
    setGameState('playing');
    setHumanMoves([]);
    setComputerMoves([]);
    setMoveCount(1);
    setLastMove(null);
    setWinningLine(null);
    setCurrentDepth(null);
    setLlmError(null);
    clearTranspositionTable();

    // Start recording a new game for NN training
    if (startMode === 'pvnn') {
      pvnnRecorder.current.currentGame = {
        nnColor: color === 'black' ? 'white' : 'black', // NN plays opposite color
        humanColor: color,
        winner: null,
        moves: [],
      };
    }

    const centerPos = 280;
    if (color === 'black') {
      setHumanMoves([[centerPos, centerPos]]);
      setLastMove([centerPos, centerPos]);
      setCurrentTurn('computer');
      // Record human's mandatory center opening
      if (startMode === 'pvnn' && pvnnRecorder.current.currentGame) {
        pvnnRecorder.current.currentGame.moves.push({
          isBlack: true,
          playedBy: 'human',
          playerMoves: [],
          opponentMoves: [],
          move: [centerPos, centerPos],
        });
      }
    } else {
      setComputerMoves([[centerPos, centerPos]]);
      setLastMove([centerPos, centerPos]);
      setCurrentTurn('human');
      // Record NN's mandatory center opening
      if (startMode === 'pvnn' && pvnnRecorder.current.currentGame) {
        pvnnRecorder.current.currentGame.moves.push({
          isBlack: true,
          playedBy: 'nn',
          playerMoves: [],
          opponentMoves: [],
          move: [centerPos, centerPos],
        });
      }
    }
  };

  const handleMove = useCallback((x, y) => {
    if (gameState !== 'playing' || currentTurn !== 'human') return;

    const gridX = snapToGrid(x);
    const gridY = snapToGrid(y);

    if (!isValidMove(gridX, gridY, humanMoves, computerMoves)) return;

    // Record this human move for NN training (pvnn mode only)
    if (gameMode === 'pvnn' && pvnnRecorder.current.currentGame) {
      const humanIsBlack = userColor === 'black';
      pvnnRecorder.current.currentGame.moves.push({
        isBlack: humanIsBlack,
        playedBy: 'human',
        playerMoves: humanIsBlack ? [...humanMoves] : [...computerMoves],
        opponentMoves: humanIsBlack ? [...computerMoves] : [...humanMoves],
        move: [gridX, gridY],
      });
    }

    const newHumanMoves = [...humanMoves, [gridX, gridY]];
    setHumanMoves(newHumanMoves);
    setLastMove([gridX, gridY]);
    if (soundEnabled) playStoneSound(audioContextRef.current);

    // Check win
    if (checkWin(newHumanMoves, gridX, gridY)) {
      setWinningLine(getWinningLine(newHumanMoves, gridX, gridY));
      // Human won — finalize recording
      if (gameMode === 'pvnn' && pvnnRecorder.current.currentGame) {
        pvnnRecorder.current.currentGame.winner = 'human';
        pvnnRecorder.current.finishedGames.push(pvnnRecorder.current.currentGame);
        pvnnRecorder.current.currentGame = null;
        setPvnnGamesRecorded(pvnnRecorder.current.finishedGames.length);
      }
      setGameState('won');
      return;
    }

    setMoveCount(moveCount + 1);
    setCurrentTurn('computer');
  }, [gameState, currentTurn, humanMoves, computerMoves, moveCount, gameMode, userColor]);

  // AI move effect
  useEffect(() => {
    if (gameMode === 'pvai' && gameState === 'playing' && currentTurn === 'computer') {
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

  // Neural network AI move effect
  useEffect(() => {
    if (gameMode !== 'pvnn' || gameState !== 'playing' || currentTurn !== 'computer') return;

    let cancelled = false;
    const runNN = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (cancelled) return;

      const aiIsBlack = userColor === 'white';

      // Record NN move for training
      if (pvnnRecorder.current.currentGame) {
        const nnPlayerMoves = aiIsBlack ? [...computerMoves] : [...computerMoves];
        const nnOpponentMoves = aiIsBlack ? [...humanMoves] : [...humanMoves];
        pvnnRecorder.current.currentGame._pendingNNState = {
          isBlack: aiIsBlack,
          playerMoves: aiIsBlack ? [...computerMoves] : [...computerMoves],
          opponentMoves: aiIsBlack ? [...humanMoves] : [...humanMoves],
        };
      }

      try {
        const move = await getNNMove(computerMoves, humanMoves, aiIsBlack, 0);
        if (cancelled || !move) return;

        // Commit NN move to recorder
        if (pvnnRecorder.current.currentGame && pvnnRecorder.current.currentGame._pendingNNState) {
          const s = pvnnRecorder.current.currentGame._pendingNNState;
          pvnnRecorder.current.currentGame.moves.push({
            isBlack: s.isBlack,
            playedBy: 'nn',
            playerMoves: s.playerMoves,
            opponentMoves: s.opponentMoves,
            move,
          });
          pvnnRecorder.current.currentGame._pendingNNState = null;
        }

        const newComputerMoves = [...computerMoves, move];
        setComputerMoves(newComputerMoves);
        setLastMove(move);
        if (soundEnabled) playStoneSound(audioContextRef.current);

        const aiWon = aiIsBlack
          ? checkWinRenju(newComputerMoves, move[0], move[1], true)
          : checkWin(newComputerMoves, move[0], move[1]);
        if (aiWon) {
          setWinningLine(getWinningLine(newComputerMoves, move[0], move[1]));
          // NN won — finalize recording
          if (pvnnRecorder.current.currentGame) {
            pvnnRecorder.current.currentGame.winner = 'nn';
            pvnnRecorder.current.finishedGames.push(pvnnRecorder.current.currentGame);
            pvnnRecorder.current.currentGame = null;
            setPvnnGamesRecorded(pvnnRecorder.current.finishedGames.length);
          }
          setGameState('lost');
          return;
        }
        setMoveCount(c => c + 1);
        setCurrentTurn('human');
      } catch (err) {
        console.error('NN AI error:', err);
      }
    };

    runNN();
    return () => { cancelled = true; };
  }, [currentTurn, gameState, gameMode, computerMoves, humanMoves, soundEnabled, userColor]);

  // LLM move effect (pvllm mode: human plays interactively against an LLM)
  useEffect(() => {
    if (gameMode !== 'pvllm' || gameState !== 'playing' || currentTurn !== 'computer') return;

    let cancelled = false;
    const runLLM = async () => {
      await new Promise(r => setTimeout(r, 600));
      if (cancelled) return;

      // Determine which color the LLM is playing
      const llmIsBlack = userColor === 'white'; // human is white → LLM is black
      const blackMoves = llmIsBlack ? computerMoves : humanMoves;
      const whiteMoves = llmIsBlack ? humanMoves : computerMoves;
      const llmColor = llmIsBlack ? 'black' : 'white';
      const allMoves = [...humanMoves, ...computerMoves];

      const result = opponentType === 'webllm'
        ? await getWebLLMMove(blackMoves, whiteMoves, llmColor, allMoves, 3, true)
        : await getAPIMove(apiConfig, blackMoves, whiteMoves, llmColor, allMoves, 3, true);

      if (cancelled) return;

      if (!result.move) {
        setLlmError(result.error || 'LLM failed to produce a valid move');
        return;
      }

      const newComputerMoves = [...computerMoves, result.move];
      setComputerMoves(newComputerMoves);
      setLastMove(result.move);
      if (soundEnabled) playStoneSound(audioContextRef.current);

      // Check win — use Renju rules if LLM is Black
      const llmWon = llmIsBlack
        ? checkWinRenju(newComputerMoves, result.move[0], result.move[1], true)
        : checkWin(newComputerMoves, result.move[0], result.move[1]);

      if (llmWon) {
        setWinningLine(getWinningLine(newComputerMoves, result.move[0], result.move[1]));
        setGameState('lost');
        return;
      }

      setMoveCount(c => c + 1);
      setCurrentTurn('human');
    };

    runLLM();
    return () => { cancelled = true; };
  }, [currentTurn, gameState, gameMode, computerMoves, humanMoves, soundEnabled, userColor, opponentType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRestart = () => {
    handleStartGame(userColor, gameMode);
  };

  const handleNewGame = () => {
    setGameState('setup');
  };

  if (gameState === 'setup') {
    // Unified setup screen (pvai, pvnn, or pvllm)
    const llmModelReady = opponentType === 'webllm'
      ? (isWebLLMLoaded() && getWebLLMLoadedModel() === webllmModel)
      : opponentType === 'api'
        ? !!apiConfig.endpoint
        : true;

    const startDisabled = (opponentType === 'webllm' && !llmModelReady) ||
                          (opponentType === 'api' && !apiConfig.endpoint) ||
                          (opponentType === 'nn' && nnModelStatus !== 'ready');

    return (
      <div style={{ padding: '20px 0', margin: '20px 0', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '25px' }}>
          <div style={{ position: 'relative', width: '600px', flexShrink: 0 }}>
            <RenjuBoard
              humanMoves={[]} computerMoves={[]} userColor="black"
              onMove={() => {}} disabled={true} lastMove={null} candidateMoves={[]}
            />
            <div style={{
              position: 'absolute', top: '50%', left: 0, right: 0,
              transform: 'translateY(-50%)',
              background: 'rgba(0, 0, 0, 0.85)', padding: '36px 20px',
              color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center',
              backdropFilter: 'blur(12px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{
                fontSize: '2.2em', fontWeight: '600', letterSpacing: '8px',
                textTransform: 'uppercase', marginBottom: '8px',
                background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Renju
              </div>
              <div style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '16px', fontWeight: '500' }}>
                Five in a row wins
              </div>

              {/* Opponent type selector */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ai', label: 'Minimax AI', emoji: '🤖' },
                  { id: 'nn', label: 'Neural AI', emoji: '🧠' },
                  { id: 'webllm', label: 'On-Device LLM', emoji: '💻' },
                  { id: 'api', label: 'API LLM', emoji: '🔌' },
                ].map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => { setOpponentType(id); setLlmError(null); }}
                    style={{
                      padding: '5px 12px',
                      background: opponentType === id ? 'rgba(99, 102, 241, 0.85)' : 'rgba(255, 255, 255, 0.08)',
                      border: opponentType === id ? '1px solid rgba(99, 102, 241, 0.9)' : '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '20px', color: '#fff', cursor: 'pointer',
                      fontSize: '0.75em', fontWeight: opponentType === id ? '600' : '400',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    <span>{emoji}</span><span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Difficulty pills — only for Minimax AI */}
              {opponentType === 'ai' && (
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '14px' }}>
                  {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      style={{
                        padding: '5px 12px',
                        background: difficulty === key ? 'rgba(99, 102, 241, 0.85)' : 'rgba(255, 255, 255, 0.08)',
                        border: difficulty === key ? '1px solid rgba(99, 102, 241, 0.9)' : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '20px', color: '#fff', cursor: 'pointer',
                        fontSize: '0.75em', fontWeight: difficulty === key ? '600' : '400',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <span>{preset.emoji}</span><span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* LLM / NN loading hints */}
              {opponentType === 'webllm' && !llmModelReady && (
                <div style={{
                  fontSize: '0.78em', color: '#94a3b8', marginBottom: '14px', textAlign: 'center'
                }}>
                  💻 Select and load a model in the panel →
                </div>
              )}
              {opponentType === 'api' && !apiConfig.endpoint && (
                <div style={{
                  fontSize: '0.78em', color: '#94a3b8', marginBottom: '14px', textAlign: 'center'
                }}>
                  🔌 Enter an API endpoint in the panel →
                </div>
              )}
              {opponentType === 'webllm' && llmModelReady && (
                <div style={{ fontSize: '0.78em', color: '#22c55e', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>✓</span>
                  <span>{WEBLLM_MODELS.find(m => m.id === webllmModel)?.label || webllmModel} ready</span>
                </div>
              )}
              {opponentType === 'nn' && nnModelStatus === 'loading' && (
                <div style={{ width: '100%', maxWidth: '260px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.78em', opacity: 0.75, marginBottom: '6px', textAlign: 'center' }}>
                    Loading model… {Math.round(nnModelProgress * 100)}%
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.round(nnModelProgress * 100)}%`,
                      height: '100%',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderRadius: '3px', transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )}
              {opponentType === 'nn' && nnModelStatus === 'ready' && (
                <div style={{ fontSize: '0.78em', color: '#22c55e', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span>✓</span> Neural network ready
                </div>
              )}
              {opponentType === 'nn' && nnModelStatus === 'error' && (
                <div style={{ fontSize: '0.78em', color: '#f87171', marginBottom: '14px', maxWidth: '260px', textAlign: 'center' }}>
                  ⚠ {nnModelError || 'Failed to load model'}
                  <div style={{ marginTop: '4px', opacity: 0.7 }}>
                    Run the training pipeline first. See <code>train/README.md</code>.
                  </div>
                </div>
              )}

              <div style={{
                fontSize: '0.8em', color: '#fff', marginBottom: '20px',
                fontWeight: '500', padding: '8px 16px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                borderRadius: '6px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                letterSpacing: '0.3px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px'
              }}>
                <span>👇</span>
                <span>{startDisabled ? 'Configure your opponent first' : 'Choose your side to begin'}</span>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {[
                  { color: 'black', label: 'Black', sub: 'You play first', bg: '#1a1a1a', textColor: '#fff',
                    stoneBg: 'radial-gradient(circle at 30% 30%, #4a4a4a, #000)',
                    shadow: '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
                    hoverShadow: '0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' },
                  { color: 'white', label: 'White', sub: 'Opponent plays first', bg: '#f5f5f5', textColor: '#1a1a1a',
                    stoneBg: 'radial-gradient(circle at 30% 30%, #fff, #d4d4d4)',
                    shadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                    hoverShadow: '0 8px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)' },
                ].map(({ color, label, sub, bg, textColor, stoneBg, shadow, hoverShadow }) => (
                  <button
                    key={color}
                    disabled={startDisabled}
                    onClick={() => handleStartGame(color, opponentType === 'ai' ? 'pvai' : opponentType === 'nn' ? 'pvnn' : 'pvllm')}
                    style={{
                      padding: '20px 32px', background: bg, border: 'none',
                      borderRadius: '16px', color: textColor,
                      cursor: startDisabled ? 'not-allowed' : 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', gap: '16px',
                      boxShadow: shadow, minWidth: '160px',
                      opacity: startDisabled ? 0.4 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!startDisabled) {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = hoverShadow;
                      }
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = shadow;
                    }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', background: stoneBg,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: '600', fontSize: '1em' }}>{label}</div>
                      <div style={{ opacity: 0.5, fontSize: '0.75em' }}>{sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Setup Panel */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '12px',
            width: '220px', flexShrink: 0, alignSelf: 'stretch'
          }}>
            <div style={{
              color: 'var(--surface-text-color)', padding: '18px',
              background: 'var(--blog-surface-background)',
              borderRadius: '12px', border: '1px solid var(--blog-surface-border, #333)'
            }}>
              {opponentType === 'ai' && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '1em', marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📖</span> How to Play
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px',
                    fontSize: '0.8em', opacity: 0.8 }}>
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
                </>
              )}

              {opponentType === 'webllm' && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.95em', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💻</span> On-Device Model
                  </div>
                  <div style={{ fontSize: '0.75em', opacity: 0.6, marginBottom: '10px' }}>
                    Runs in your browser via WebGPU
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '0.75em', opacity: 0.7, marginBottom: '3px' }}>Model</div>
                    <select
                      value={webllmModel}
                      onChange={(e) => setWebllmModel(e.target.value)}
                      style={{
                        width: '100%', padding: '6px 8px', fontSize: '0.8em',
                        borderRadius: '6px', border: '1px solid var(--blog-surface-border, #444)',
                        background: 'var(--blog-surface-background, #1a1a1a)',
                        color: 'var(--surface-text-color)', boxSizing: 'border-box',
                        outline: 'none', cursor: 'pointer'
                      }}
                    >
                      {WEBLLM_MODELS.map(m => (
                        <option key={m.id} value={m.id}>{m.label} ({m.size})</option>
                      ))}
                    </select>
                  </div>
                  {webllmLoading ? (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.72em', opacity: 0.8, marginBottom: '6px',
                        wordBreak: 'break-word', lineHeight: '1.4' }}>
                        {webllmProgress.text || 'Initializing...'}
                      </div>
                      <div style={{ width: '100%', height: '6px',
                        background: 'var(--blog-surface-border, #333)',
                        borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.round(webllmProgress.progress * 100)}%`,
                          height: '100%',
                          background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                          borderRadius: '3px', transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  ) : isWebLLMLoaded() && getWebLLMLoadedModel() === webllmModel ? (
                    <div style={{ fontSize: '0.75em', color: '#22c55e', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓</span> Model ready
                    </div>
                  ) : null}
                  <button
                    disabled={webllmLoading}
                    onClick={async () => {
                      setWebllmLoading(true);
                      setWebllmProgress({ text: '', progress: 0 });
                      setLlmError(null);
                      try {
                        await loadWebLLMModel(webllmModel, (p) => setWebllmProgress(p));
                      } catch (err) {
                        setLlmError('Failed to load model: ' + err.message);
                      } finally {
                        setWebllmLoading(false);
                      }
                    }}
                    style={{
                      marginTop: '6px', padding: '10px 14px',
                      background: webllmLoading ? '#555' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      border: 'none', borderRadius: '10px', color: '#fff',
                      cursor: webllmLoading ? 'not-allowed' : 'pointer',
                      fontSize: '0.85em', fontWeight: '600', transition: 'all 0.2s',
                      boxShadow: webllmLoading ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.35)',
                      width: '100%', boxSizing: 'border-box',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: '6px', minHeight: '40px'
                    }}
                  >
                    <span>💻</span>
                    <span>
                      {webllmLoading
                        ? 'Loading...'
                        : (isWebLLMLoaded() && getWebLLMLoadedModel() === webllmModel)
                          ? 'Model Loaded ✓'
                          : 'Load Model'}
                    </span>
                  </button>
                </>
              )}

              {opponentType === 'api' && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '0.95em', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🔌</span> API Endpoint
                  </div>
                  <div style={{ fontSize: '0.75em', opacity: 0.6, marginBottom: '10px' }}>
                    Any OpenAI-compatible endpoint (Docker Model Runner, Ollama, Azure, etc.)
                  </div>
                  {[
                    { key: 'endpoint', label: 'Endpoint', placeholder: 'http://localhost:12434/engines/llama.cpp/v1/chat/completions' },
                    { key: 'model', label: 'Model (optional)', placeholder: 'ai/mistral' },
                    { key: 'apiKey', label: 'API Key (optional)', placeholder: 'your-api-key', type: 'password' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.75em', opacity: 0.7, marginBottom: '3px' }}>{label}</div>
                      <input
                        type={type || 'text'}
                        value={apiConfig[key]}
                        onChange={(e) => setApiConfig(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{
                          width: '100%', padding: '6px 8px', fontSize: '0.8em',
                          borderRadius: '6px', border: '1px solid var(--blog-surface-border, #444)',
                          background: 'var(--blog-surface-background, #1a1a1a)',
                          color: 'var(--surface-text-color)', boxSizing: 'border-box', outline: 'none'
                        }}
                      />
                    </div>
                  ))}
                </>
              )}

              {opponentType === 'nn' && (
                <>
                  <div style={{ fontWeight: '600', fontSize: '1em', marginBottom: '14px',
                    display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧠</span> About the Model
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px',
                    fontSize: '0.8em', opacity: 0.8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏗</span><span>ResNet · 6 blocks · 64 ch</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📚</span><span>Trained on minimax self-play</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🎮</span><span>Fine-tuned with MCTS RL</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚡</span><span>Runs fully in-browser (ONNX)</span>
                    </div>
                  </div>
                  {nnModelStatus === 'error' && (
                    <div style={{ marginTop: '12px', color: '#f87171', fontSize: '0.75em' }}>
                      ⚠ {nnModelError || 'Model failed to load'}
                    </div>
                  )}
                </>
              )}

              {llmError && gameState === 'setup' && (
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
            {gameMode === 'pvllm' ? (
              <>
                <div style={{ fontSize: '0.7em', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>You vs LLM</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.4em' }}>{userColor === 'black' ? '⚫' : '⚪'}</span>
                  <span style={{ fontWeight: '600', fontSize: '0.95em' }}>You ({userColor === 'black' ? 'Black' : 'White'})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.75 }}>
                  <span style={{ fontSize: '1.4em' }}>{userColor === 'black' ? '⚪' : '⚫'}</span>
                  <span style={{ fontWeight: '500', fontSize: '0.85em' }}>
                    {opponentType === 'webllm'
                      ? (WEBLLM_MODELS.find(m => m.id === webllmModel)?.label || webllmModel)
                      : (apiConfig.model || 'API')}
                  </span>
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
              {gameMode === 'pvllm'
                ? (currentTurn === 'human'
                    ? '🎯 Your Turn'
                    : `💭 ${opponentType === 'webllm' ? (WEBLLM_MODELS.find(m => m.id === webllmModel)?.label || 'LLM') : (apiConfig.model || 'LLM')} thinking...`)
                : gameMode === 'pvnn'
                  ? (currentTurn === 'human' ? '🎯 Your Turn' : '🧠 Neural AI Thinking...')
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
              <div style={{ fontSize: '1.5em', marginBottom: '6px', color: '#fff' }}>
                {gameMode === 'pvllm'
                   ? (gameState === 'won' ? '🎉' : <TbMessageChatbot style={{ color: '#fff' }} />)
                   : gameMode === 'pvnn'
                     ? (gameState === 'won' ? '🎉' : '🧠')
                     : (gameState === 'won' ? '🎉' : '🤖')}
              </div>
              <div style={{
                color: '#fff',
                fontWeight: '600',
                fontSize: '1em'
              }}>
                {gameMode === 'pvllm'
                   ? (gameState === 'won'
                       ? 'You Won!'
                       : `${opponentType === 'webllm' ? (WEBLLM_MODELS.find(m => m.id === webllmModel)?.label || webllmModel) : (apiConfig.model || 'API')} Won!`)
                   : gameMode === 'pvnn'
                     ? (gameState === 'won' ? 'You Won!' : 'Neural AI Won')
                     : (gameState === 'won' ? 'You Won!' : 'AI Won')}
              </div>
            </div>
          )}

          {/* LLM Error */}
          {llmError && gameMode === 'pvllm' && (
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
            onClick={handleNewGame}
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

          {/* Export training data button — visible in pvnn mode once games are recorded */}
          {gameMode === 'pvnn' && pvnnGamesRecorded > 0 && (
            <button
              onClick={() => {
                const data = {
                  version: 1,
                  exported: new Date().toISOString(),
                  games: pvnnRecorder.current.finishedGames,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `renju_human_games_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: '12px 15px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '10px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px'
              }}
            >
              <span>📥</span>
              <span>Export {pvnnGamesRecorded} game{pvnnGamesRecorded !== 1 ? 's' : ''} for training</span>
            </button>
          )}

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

          {/* AI Thinking Toggle — not applicable for Neural AI mode */}
          {gameMode !== 'pvnn' && gameMode !== 'pvllm' && (
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
            <div style={{ fontWeight: '500', textAlign: 'center', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {(() => {
                // Determine if current move is black: odd moveCount = black's turn, even = white's
                const isBlack = moveCount % 2 === 1;
                return (
                  <div style={{
                    width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                    background: isBlack
                      ? 'radial-gradient(circle at 30% 30%, #4a4a4a, #000)'
                      : 'radial-gradient(circle at 30% 30%, #fff, #d4d4d4)',
                    boxShadow: isBlack
                      ? '0 1px 3px rgba(0,0,0,0.4)'
                      : '0 1px 3px rgba(0,0,0,0.2)',
                    border: !isBlack ? '1px solid #ccc' : 'none'
                  }} />
                );
              })()}
              <span>Move #{Math.ceil(moveCount / 2)}</span>
            </div>
            {gameMode === 'pvai' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8 }}>
              <span>Difficulty:</span>
              <span style={{ fontWeight: '500' }}>{DIFFICULTY_PRESETS[difficulty]?.emoji} {DIFFICULTY_PRESETS[difficulty]?.label}</span>
            </div>
            )}
            {gameMode === 'pvai' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Max Depth:</span>
              <span style={{ fontWeight: '500' }}>{maxDepth}</span>
            </div>
            )}
            {gameMode === 'pvai' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Current Depth:</span>
              <span style={{ fontWeight: '500' }}>{currentDepth ?? '—'}</span>
            </div>
            )}
            {gameMode === 'pvnn' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', opacity: 0.8, marginTop: '4px' }}>
              <span>Engine:</span>
              <span style={{ fontWeight: '500' }}>Neural Net (ONNX)</span>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RenjuGame;
