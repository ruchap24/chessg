'use client';

import { motion } from 'framer-motion';

interface MatchmakingCardProps {
  queueStartTime: number | null;
  queueSize: number;
  waitTime?: number;
  onCancel: () => void;
}

export default function MatchmakingCard({
  queueStartTime,
  queueSize,
  waitTime,
  onCancel,
}: MatchmakingCardProps) {
  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
    >
      <div className="text-center">
        <div className="mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"
          />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Searching for opponent...</h2>
        <p className="text-white/70 mb-4">
          {waitTime !== undefined ? `Waiting: ${formatWaitTime(waitTime)}` : 'Finding match...'}
        </p>
        <p className="text-white/60 text-sm mb-6">
          Players in queue: {queueSize}
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="bg-red-600/80 text-white font-semibold py-2 px-6 rounded-lg hover:bg-red-600 transition-all"
        >
          Cancel
        </motion.button>
      </div>
    </motion.div>
  );
}

