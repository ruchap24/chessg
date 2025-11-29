'use client';

import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardProps {
  fen: string;
  onMove: (from: string, to: string) => void;
  disabled?: boolean;
  playerColor?: 'white' | 'black' | null;
}

export default function ChessBoard({
  fen,
  onMove,
  disabled = false,
  playerColor = 'white',
}: ChessBoardProps) {
  const [game] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const onSquareClick = (square: string) => {
    if (disabled) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
      } else {
        onMove(selectedSquare, square);
        setSelectedSquare(null);
      }
    } else {
      setSelectedSquare(square);
    }
  };

  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (disabled) return false;

    onMove(sourceSquare, targetSquare);
    return true;
  };

  const getCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        background: 'rgba(147, 51, 234, 0.4)',
      };

      game.load(fen);
      const moves = game.moves({ square: selectedSquare as any, verbose: true });
      moves.forEach((move: any) => {
        styles[move.to] = {
          background: 'rgba(34, 197, 94, 0.4)',
        };
      });
    }

    return styles;
  };

  const boardOrientation = playerColor === 'black' ? 'black' : 'white';

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Chessboard
        position={fen}
        onSquareClick={onSquareClick}
        onPieceDrop={onPieceDrop}
        boardOrientation={boardOrientation}
        customSquareStyles={getCustomSquareStyles()}
        arePiecesDraggable={!disabled}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      />
    </div>
  );
}

