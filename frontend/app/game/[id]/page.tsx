'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import { useGameStore } from '../../../store/gameStore';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { useGameEvents } from '../../../hooks/useGameEvents';
import { api } from '../../../lib/api';
import ProtectedRoute from '../../../components/ProtectedRoute';
import ChessBoard from '../../../components/ChessBoard';
import MoveHistory from '../../../components/MoveHistory';
import ChatPanel from '../../../components/ChatPanel';
import PiecePromotionModal from '../../../components/PiecePromotionModal';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { user } = useAuth();
  const { emit } = useWebSocket();
  const {
    currentGame,
    fen,
    moves,
    playerColor,
    gameStatus,
    updateGame,
    setPlayerColor,
    reset,
  } = useGameStore();
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);

  useGameEvents(gameId);

  useEffect(() => {
    const loadGame = async () => {
      try {
        const response = await api.get(`/game/${gameId}`);
        const game = response.data;
        updateGame(game);

        if (game.whitePlayerId === user?.id) {
          setPlayerColor('white');
        } else if (game.blackPlayerId === user?.id) {
          setPlayerColor('black');
        }

        emit('join_game', { gameId });
      } catch (error) {
        console.error('Failed to load game:', error);
        router.push('/lobby');
      }
    };

    if (gameId && user) {
      loadGame();
    }

    return () => {
      reset();
    };
  }, [gameId, user, updateGame, setPlayerColor, emit, router, reset]);

  const handleMove = (from: string, to: string) => {
    if (gameStatus !== 'in_progress') return;
    if (!playerColor) return;

    const isPawnPromotion = (from[1] === '7' && playerColor === 'white') || 
                           (from[1] === '2' && playerColor === 'black');

    if (isPawnPromotion) {
      setPendingMove({ from, to });
      setShowPromotionModal(true);
    } else {
      emit('make_move', { gameId, move: `${from}${to}` });
    }
  };

  const handlePromotion = (piece: string) => {
    if (pendingMove) {
      emit('make_move', {
        gameId,
        move: `${pendingMove.from}${pendingMove.to}`,
        promotion: piece,
      });
      setPendingMove(null);
      setShowPromotionModal(false);
    }
  };

  const handleResign = async () => {
    if (confirm('Are you sure you want to resign?')) {
      try {
        await api.post(`/game/${gameId}/resign`);
      } catch (error) {
        console.error('Failed to resign:', error);
      }
    }
  };

  const handleOfferDraw = async () => {
    try {
      emit('request_draw', { gameId });
    } catch (error) {
      console.error('Failed to offer draw:', error);
    }
  };

  if (!currentGame) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white">Loading game...</div>
        </div>
      </ProtectedRoute>
    );
  }

  const isMyTurn = gameStatus === 'in_progress' && playerColor === 
    (fen.split(' ')[1] === 'w' ? 'white' : 'black');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <h2 className="text-xl font-bold text-white mb-4">Game Info</h2>
                <div className="space-y-2 text-white/90">
                  <div>
                    <span className="font-semibold">Status: </span>
                    <span className={gameStatus === 'in_progress' ? 'text-green-400' : 'text-yellow-400'}>
                      {gameStatus}
                    </span>
                  </div>
                  {isMyTurn && (
                    <div className="text-green-400 font-semibold">Your turn!</div>
                  )}
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <div className="text-white font-semibold">White</div>
                    <div className="text-white/70 text-sm">ELO: {currentGame.whitePlayerId === user?.id ? user.eloRating : '---'}</div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold">Black</div>
                    <div className="text-white/70 text-sm">ELO: {currentGame.blackPlayerId === user?.id ? user.eloRating : '---'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex gap-2">
                  <button
                    onClick={handleResign}
                    className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-all"
                  >
                    Resign
                  </button>
                  <button
                    onClick={handleOfferDraw}
                    className="flex-1 bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-700 transition-all"
                  >
                    Offer Draw
                  </button>
                </div>
              </div>

              <MoveHistory moves={moves} />
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <ChessBoard
                  fen={fen}
                  onMove={handleMove}
                  disabled={!isMyTurn || gameStatus !== 'in_progress'}
                  playerColor={playerColor}
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <ChatPanel gameId={gameId} />
            </div>
          </div>
        </div>

        {showPromotionModal && (
          <PiecePromotionModal
            playerColor={playerColor || 'white'}
            onSelect={handlePromotion}
            onClose={() => {
              setShowPromotionModal(false);
              setPendingMove(null);
            }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

