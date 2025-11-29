'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface PiecePromotionModalProps {
  playerColor: 'white' | 'black';
  onSelect: (piece: string) => void;
  onClose: () => void;
}

const pieces = [
  { symbol: 'Q', name: 'Queen', value: 'q' },
  { symbol: 'R', name: 'Rook', value: 'r' },
  { symbol: 'B', name: 'Bishop', value: 'b' },
  { symbol: 'N', name: 'Knight', value: 'n' },
];

export default function PiecePromotionModal({
  playerColor,
  onSelect,
  onClose,
}: PiecePromotionModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Promote Pawn
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {pieces.map((piece) => (
              <motion.button
                key={piece.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onSelect(piece.value)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-6 text-white text-4xl font-bold transition-all"
              >
                <div className="text-6xl mb-2">
                  {playerColor === 'white' ? piece.symbol.toUpperCase() : piece.symbol.toLowerCase()}
                </div>
                <div className="text-sm">{piece.name}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

