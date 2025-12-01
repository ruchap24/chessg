'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface BotDifficultyModalProps {
  onClose: () => void;
}

const difficulties = [
  {
    value: 'easy',
    name: 'Easy',
    description: 'Random legal moves. Perfect for beginners.',
    color: 'from-green-500 to-green-600',
  },
  {
    value: 'medium',
    name: 'Medium',
    description: 'Evaluates material and position. Good for intermediate players.',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    value: 'hard',
    name: 'Hard',
    description: 'Uses minimax algorithm with depth 3. Challenging for advanced players.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    value: 'expert',
    name: 'Expert',
    description: 'Minimax with alpha-beta pruning, depth 5. Very challenging!',
    color: 'from-red-500 to-red-600',
  },
];

export default function BotDifficultyModal({ onClose }: BotDifficultyModalProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleStartGame = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/bot/game/create', {
        difficulty: selectedDifficulty,
        playerColor: 'white',
      });
      router.push(`/game/${response.data.gameId}`);
    } catch (error) {
      console.error('Failed to create bot game:', error);
      alert('Failed to start bot game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-white/20"
        >
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Choose Difficulty
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {difficulties.map((difficulty) => (
              <motion.button
                key={difficulty.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedDifficulty(difficulty.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDifficulty === difficulty.value
                    ? `bg-gradient-to-r ${difficulty.color} border-white`
                    : 'bg-white/10 border-white/20 hover:bg-white/20'
                }`}
              >
                <div className="text-left">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {difficulty.name}
                  </h3>
                  <p className="text-white/70 text-sm">
                    {difficulty.description}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartGame}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Starting...' : 'Start Game'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
