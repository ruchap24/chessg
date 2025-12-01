'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface GameResultModalProps {
  isOpen: boolean;
  result: 'white_win' | 'black_win' | 'draw' | null;
  reason: string;
  eloChange?: number;
  playerColor: 'white' | 'black' | null;
  onClose: () => void;
}

export default function GameResultModal({
  isOpen,
  result,
  reason,
  eloChange,
  playerColor,
  onClose,
}: GameResultModalProps) {
  const router = useRouter();

  const isWin = (result === 'white_win' && playerColor === 'white') ||
                (result === 'black_win' && playerColor === 'black');

  if (isWin && typeof window !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  }

  const getResultText = () => {
    if (result === 'draw') return 'Draw';
    if (isWin) return 'You Win!';
    return 'You Lost';
  };

  const getResultColor = () => {
    if (result === 'draw') return 'text-yellow-400';
    if (isWin) return 'text-green-400';
    return 'text-red-400';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20"
          >
            <h2 className={`text-4xl font-bold text-center mb-4 ${getResultColor()}`}>
              {getResultText()}
            </h2>
            <p className="text-white/70 text-center mb-6">{reason}</p>
            
            {eloChange !== undefined && (
              <div className="text-center mb-6">
                <div className="text-white/90 text-sm mb-1">ELO Change</div>
                <div className={`text-2xl font-bold ${eloChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {eloChange > 0 ? '+' : ''}{eloChange}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/lobby')}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Back to Lobby
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


