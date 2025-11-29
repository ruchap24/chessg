'use client';

import { motion } from 'framer-motion';
import { useWebSocketStore } from '../store/websocketStore';

export default function ConnectionStatus() {
  const { isConnected, reconnecting } = useWebSocketStore();

  if (isConnected && !reconnecting) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 bg-yellow-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2"
    >
      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
      <span className="text-sm font-semibold">
        {reconnecting ? 'Reconnecting...' : 'Disconnected'}
      </span>
    </motion.div>
  );
}

