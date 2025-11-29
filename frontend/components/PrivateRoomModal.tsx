'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivateRoomModalProps {
  mode: 'create' | 'join';
  roomCode: string | null;
  onClose: () => void;
  onJoin: (code: string) => void;
}

export default function PrivateRoomModal({
  mode,
  roomCode,
  onClose,
  onJoin,
}: PrivateRoomModalProps) {
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (roomCode && navigator.share) {
      navigator.share({
        title: 'Join my chess game',
        text: `Join my chess game with code: ${roomCode}`,
        url: window.location.href,
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/20"
        >
          {mode === 'create' && roomCode ? (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Private Room Created</h2>
              <div className="mb-6">
                <p className="text-white/70 mb-2">Share this code with your opponent:</p>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={roomCode}
                    readOnly
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-center text-2xl font-bold"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleCopy}
                    className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-all"
                  >
                    {copied ? '✓' : 'Copy'}
                  </motion.button>
                </div>
                {navigator.share && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleShare}
                    className="w-full bg-white/10 text-white font-semibold py-2 px-4 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Share Link
                  </motion.button>
                )}
              </div>
              <p className="text-white/60 text-sm mb-4">
                Waiting for opponent to join...
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="w-full bg-red-600/80 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition-all"
              >
                Cancel
              </motion.button>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Join Private Room</h2>
              <div className="mb-6">
                <label className="block text-white/70 mb-2">Enter Room Code:</label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="ABCD12"
                  maxLength={6}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white text-center text-2xl font-bold uppercase"
                />
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex-1 bg-white/10 text-white font-semibold py-2 px-4 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onJoin(inputCode)}
                  disabled={inputCode.length !== 6}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

