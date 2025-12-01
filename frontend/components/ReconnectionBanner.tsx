'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocketStore } from '../store/websocketStore';

export default function ReconnectionBanner() {
  const { isConnected, reconnecting } = useWebSocketStore();

  if (isConnected && !reconnecting) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 bg-yellow-600 text-white px-4 py-3 z-50 shadow-lg"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <div>
              <div className="font-semibold">Connection lost</div>
              <div className="text-sm text-yellow-100">Reconnecting...</div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


