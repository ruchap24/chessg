'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import { useMatchmakingStore } from '../../store/matchmakingStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { api } from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import MatchmakingCard from '../../components/MatchmakingCard';
import PrivateRoomModal from '../../components/PrivateRoomModal';

export default function LobbyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { emit, on, off } = useWebSocket();
  const {
    inQueue,
    queueStartTime,
    roomCode,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
    reset,
  } = useMatchmakingStore();
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [isPrivateMode, setIsPrivateMode] = useState<'create' | 'join' | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ queueSize: number; waitTime?: number } | null>(null);

  useEffect(() => {
    const handleMatchFound = (data: { gameId: string }) => {
      reset();
      router.push(`/game/${data.gameId}`);
    };

    on('match_found', handleMatchFound);
    const statusInterval = setInterval(async () => {
      if (inQueue) {
        try {
          const response = await api.get('/matchmaking/status');
          setQueueStatus(response.data);
        } catch (error) {
          console.error('Failed to fetch queue status:', error);
        }
      }
    }, 2000);

    return () => {
      off('match_found', handleMatchFound);
      clearInterval(statusInterval);
    };
  }, [inQueue, on, off, router, reset]);

  const handleFindMatch = async () => {
    try {
      await api.post('/matchmaking/queue');
      joinQueue();
    } catch (error) {
      console.error('Failed to join queue:', error);
    }
  };

  const handleCancelMatch = async () => {
    try {
      await api.delete('/matchmaking/queue');
      leaveQueue();
    } catch (error) {
      console.error('Failed to leave queue:', error);
    }
  };

  const handleCreatePrivateRoom = async () => {
    try {
      const response = await api.post('/matchmaking/private/create');
      createRoom(response.data.roomCode);
      setShowPrivateModal(true);
      setIsPrivateMode('create');
    } catch (error) {
      console.error('Failed to create private room:', error);
    }
  };

  const handleJoinPrivateRoom = () => {
    setShowPrivateModal(true);
    setIsPrivateMode('join');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">♔ Chess Lobby</h1>
              <p className="text-white/70">Welcome, {user?.username}</p>
              <div className="mt-4">
                <span className="text-white/90">ELO Rating: </span>
                <span className="text-2xl font-bold text-yellow-400">{user?.eloRating || 1200}</span>
              </div>
            </div>

            {inQueue ? (
              <MatchmakingCard
                queueStartTime={queueStartTime}
                queueSize={queueStatus?.queueSize || 0}
                waitTime={queueStatus?.waitTime}
                onCancel={handleCancelMatch}
              />
            ) : (
              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleFindMatch}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Find Match
                </motion.button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-white/70">Or</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCreatePrivateRoom}
                    className="bg-white/10 text-white font-semibold py-4 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Create Private Room
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJoinPrivateRoom}
                    className="bg-white/10 text-white font-semibold py-4 px-6 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
                  >
                    Join Private Room
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {showPrivateModal && (
          <PrivateRoomModal
            mode={isPrivateMode || 'create'}
            roomCode={roomCode}
            onClose={() => {
              setShowPrivateModal(false);
              setIsPrivateMode(null);
            }}
            onJoin={async (code: string) => {
              try {
                const response = await api.post('/matchmaking/private/join', { roomCode: code });
                joinRoom(code);
                router.push(`/game/${response.data.gameId}`);
              } catch (error) {
                console.error('Failed to join private room:', error);
                alert('Invalid room code or room not found');
              }
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
