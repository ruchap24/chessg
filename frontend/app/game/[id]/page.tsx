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
    isPlayingBot,
    botDifficulty,
    isBotThinking,
    updateGame,
    setPlayerColor,
    setIsPlayingBot,
    setBotDifficulty,
    setBotThinking,
    reset,
  } = useGameStore();
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);


  useEffect(() => {
    const loadGame = async () => {
      try {
        let game;
        if (gameId) {
          const response = await api.get(`/game/${gameId}`);
          game = response.data;
        } else {
          const response = await api.get('/game/active');
          if (response.data) {
            game = response.data;
            router.replace(`/game/${game.id}`);
          } else {
            router.push('/lobby');
            return;
          }
        }

        updateGame(game);
        const isBotGame = game.isBotGame || false;
        setIsPlayingBot(isBotGame);
        if (isBotGame && game.botDifficulty) {
          setBotDifficulty(game.botDifficulty);
        }
        if (game.whitePlayerId === user?.id) {
          setPlayerColor('white');
        } else if (game.blackPlayerId === user?.id) {
          setPlayerColor('black');
        }
        if (!isBotGame) {
          emit('join_game', { gameId: game.id });
        }
      } catch (error) {
        console.error('Failed to load game:', error);
        router.push('/lobby');
      }
    };

    if (user) {
      loadGame();
    }

    return () => {
      reset();
    };
  }, [gameId, user, updateGame, setPlayerColor, setIsPlayingBot, setBotDifficulty, emit, router, reset]);

  useEffect(() => {
    if (!isPlayingBot || !currentGame || !gameId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/game/${gameId}`);
        const game = response.data;
        
        const currentTurn = game.currentFen.split(' ')[1];
        const isBotTurn = (currentTurn === 'w' && game.whitePlayer?.isBot) ||
                         (currentTurn === 'b' && game.blackPlayer?.isBot);
        
        if (isBotTurn && game.status === 'in_progress') {
          setBotThinking(true);
        } else {
          setBotThinking(false);
        }
        if (game.currentFen !== fen) {
          updateGame(game);
        }
      } catch (error) {
        console.error('Failed to poll game state:', error);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [isPlayingBot, gameId, currentGame, fen, updateGame, setBotThinking]);

  const handleMove = (from: string, to: string) => {
    if (gameStatus !== 'in_progress') return;
    if (!playerColor) return;

    const isPawnPromotion = (from[1] === '7' && playerColor === 'white') || 
                           (from[1] === '2' && playerColor === 'black');

    if (isPawnPromotion) {
      setPendingMove({ from, to });
      setShowPromotionModal(true);
    } else {
      if (isPlayingBot) {
        api.post(`/game/${gameId}/move`, {
          move: `${from}${to}`,
        }).catch((error) => {
          console.error('Failed to make move:', error);
        });
      } else {
        emit('make_move', { gameId, move: `${from}${to}` });
      }
    }
  };

  const handlePromotion = (piece: string) => {
    if (pendingMove) {
      if (isPlayingBot) {
        api.post(`/game/${gameId}/move`, {
          move: `${pendingMove.from}${pendingMove.to}`,
          promotion: piece,
        }).catch((error) => {
          console.error('Failed to make move:', error);
        });
      } else {
        emit('make_move', {
          gameId,
          move: `${pendingMove.from}${pendingMove.to}`,
          promotion: piece,
        });
      }
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
                    <div className="text-white font-semibold flex items-center gap-2">
                      White
                      {currentGame.whitePlayer?.isBot && (
                        <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                          🤖 Bot {botDifficulty ? `- ${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-white/70 text-sm">
                      {currentGame.whitePlayer?.username || 'ChessBot'}
                    </div>
                    {!currentGame.whitePlayer?.isBot && (
                      <div className="text-white/70 text-sm">
                        ELO: {currentGame.whitePlayer?.eloRating || '---'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      Black
                      {currentGame.blackPlayer?.isBot && (
                        <span className="text-xs bg-purple-600 px-2 py-1 rounded">
                          🤖 Bot {botDifficulty ? `- ${botDifficulty.charAt(0).toUpperCase() + botDifficulty.slice(1)}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-white/70 text-sm">
                      {currentGame.blackPlayer?.username || 'ChessBot'}
                    </div>
                    {!currentGame.blackPlayer?.isBot && (
                      <div className="text-white/70 text-sm">
                        ELO: {currentGame.blackPlayer?.eloRating || '---'}
                      </div>
                    )}
                  </div>
                </div>
                {isBotThinking && (
                  <div className="mt-4 p-2 bg-purple-600/20 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-300 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-300 border-t-transparent"></div>
                      Bot is thinking...
                    </div>
                  </div>
                )}
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

            {!isPlayingBot && (
              <div className="lg:col-span-1">
                <ChatPanel gameId={gameId} />
              </div>
            )}
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

