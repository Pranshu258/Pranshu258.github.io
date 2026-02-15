import React, { useRef, useEffect } from 'react';
import { GRID_SIZE, BOARD_SIZE, BOARD_OFFSET } from './gameLogic';

const RenjuBoard = ({ 
  humanMoves, 
  computerMoves, 
  userColor,
  onMove,
  disabled,
  lastMove,
  candidateMoves = [],
  winningLine = null
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    drawBoard(ctx, humanMoves, computerMoves, userColor, lastMove, candidateMoves, winningLine);
  }, [humanMoves, computerMoves, userColor, lastMove, candidateMoves, winningLine]);

  const drawBoard = (ctx, human, computer, userStoneColor, lastMovePos, candidates, winLine) => {
    // Clear canvas
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Draw background with wood gradient
    const woodGradient = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
    woodGradient.addColorStop(0, '#DEB887');
    woodGradient.addColorStop(0.3, '#D4A574');
    woodGradient.addColorStop(0.6, '#C9956C');
    woodGradient.addColorStop(1, '#D4A574');
    ctx.fillStyle = woodGradient;
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    
    // Add subtle wood grain lines
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i += 8) {
      ctx.beginPath();
      ctx.moveTo(0, i + Math.sin(i * 0.05) * 3);
      ctx.lineTo(BOARD_SIZE, i + Math.sin(i * 0.05 + 2) * 3);
      ctx.stroke();
    }
    
    // Draw grid lines (15 lines for a 15x15 board, indices 0-14)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 1;
    
    const lastLinePos = BOARD_OFFSET + 14 * GRID_SIZE; // 580
    
    for (let i = 0; i < 15; i++) {
      const pos = BOARD_OFFSET + i * GRID_SIZE;
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, BOARD_OFFSET);
      ctx.lineTo(pos, lastLinePos);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(BOARD_OFFSET, pos);
      ctx.lineTo(lastLinePos, pos);
      ctx.stroke();
    }
    
    // Draw star points (decorative dots)
    const starPoints = [
      [3, 3], [3, 11], [7, 7], [11, 3], [11, 11]
    ];
    ctx.fillStyle = '#2a1810';
    starPoints.forEach(([x, y]) => {
      const px = BOARD_OFFSET + x * GRID_SIZE;
      const py = BOARD_OFFSET + y * GRID_SIZE;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw stones
    const stoneRadius = GRID_SIZE * 0.4;
    
    // Determine colors
    const humanColor = userStoneColor === 'white' ? '#FFF' : '#000';
    const computerColor = userStoneColor === 'white' ? '#000' : '#FFF';
    
    // Draw computer stones
    computer.forEach(([x, y]) => {
      drawStone(ctx, x + GRID_SIZE / 2, y + GRID_SIZE / 2, stoneRadius, computerColor);
    });
    
    // Draw human stones
    human.forEach(([x, y]) => {
      drawStone(ctx, x + GRID_SIZE / 2, y + GRID_SIZE / 2, stoneRadius, humanColor);
    });

    // Highlight the last move
    if (lastMovePos) {
      const [lx, ly] = lastMovePos;
      const cx = lx + GRID_SIZE / 2;
      const cy = ly + GRID_SIZE / 2;
      const isOnWhite = 
        (human.some(([hx, hy]) => hx === lx && hy === ly) && userStoneColor === 'white') ||
        (computer.some(([cx, cy]) => cx === lx && cy === ly) && userStoneColor === 'black');
      
      // Draw a small red circle indicator
      ctx.save();
      ctx.fillStyle = isOnWhite ? '#e53935' : '#ff6b6b';
      ctx.beginPath();
      ctx.arc(cx, cy, stoneRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw candidate moves being evaluated by AI
    if (candidates && candidates.length > 0) {
      candidates.forEach(({ move, status, score }) => {
        const [mx, my] = move;
        const cx = mx + GRID_SIZE / 2;
        const cy = my + GRID_SIZE / 2;
        
        ctx.save();
        
        if (status === 'evaluating') {
          // Pulsing yellow indicator for currently evaluating
          ctx.strokeStyle = '#ffc107';
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, stoneRadius + 4, 0, Math.PI * 2);
          ctx.stroke();
        } else if (status === 'evaluated') {
          // Blue indicator for evaluated moves, with intensity based on score
          const normalizedScore = Math.min(Math.max((score + 10) / 20, 0), 1);
          const alpha = 0.3 + normalizedScore * 0.5;
          ctx.fillStyle = `rgba(33, 150, 243, ${alpha})`;
          ctx.beginPath();
          ctx.arc(cx, cy, stoneRadius * 0.6, 0, Math.PI * 2);
          ctx.fill();
          
          // Show score
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(score?.toFixed(0) || '?', cx, cy);
        }
        
        ctx.restore();
      });
    }

    // Draw winning line strike-through
    if (winLine && winLine.length >= 2) {
      ctx.save();
      
      // Get first and last stone positions
      const firstStone = winLine[0];
      const lastStone = winLine[winLine.length - 1];
      
      const x1 = firstStone[0] + GRID_SIZE / 2;
      const y1 = firstStone[1] + GRID_SIZE / 2;
      const x2 = lastStone[0] + GRID_SIZE / 2;
      const y2 = lastStone[1] + GRID_SIZE / 2;
      
      // Draw a thick red line through the winning stones
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      
      ctx.restore();
    }
  };

  const drawStone = (ctx, x, y, radius, color) => {
    // Draw shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw stone
    if (color === '#FFF') {
      // White stone with gradient
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
      );
      gradient.addColorStop(0, '#FFF');
      gradient.addColorStop(1, '#E0E0E0');
      ctx.fillStyle = gradient;
    } else {
      // Black stone with gradient
      const gradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
      );
      gradient.addColorStop(0, '#444');
      gradient.addColorStop(1, '#000');
      ctx.fillStyle = gradient;
    }
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw highlight
    const highlightGradient = ctx.createRadialGradient(
      x - radius * 0.4, y - radius * 0.4, 0,
      x - radius * 0.4, y - radius * 0.4, radius * 0.5
    );
    highlightGradient.addColorStop(0, color === '#FFF' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = color === '#FFF' ? '#AAA' : '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  };

  const handleClick = (e) => {
    if (disabled) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates to account for CSS scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    onMove(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      width={BOARD_SIZE}
      height={BOARD_SIZE}
      onClick={handleClick}
      style={{
        borderRadius: '8px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 0 4px rgba(139, 90, 43, 0.5)',
        cursor: disabled ? 'default' : 'pointer',
        display: 'block',
        background: 'linear-gradient(145deg, #DEB887, #D4A574)',
        width: '100%',
        height: 'auto',
        border: '4px solid #8B5A2B'
      }}
    />
  );
};

export default RenjuBoard;
