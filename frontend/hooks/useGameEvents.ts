import { useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { useGameStore } from '../store/gameStore';

export const useGameEvents = (gameId: string) => {
  const { on, off } = useWebSocket();
  const { updateGame, addMove, updateFen, setGameStatus, setResult } = useGameStore();

  useEffect(() => {
    const handleMoveMade = (data: {
      gameId: string;
      move: any;
      fen: string;
      gameStatus: string;
      result?: string;
    }) => {
      if (data.gameId === gameId) {
        updateFen(data.fen);
        addMove(data.move);
        setGameStatus(data.gameStatus);
        if (data.result) {
          setResult(data.result);
        }
      }
    };

    const handleGameOver = (data: { gameId: string; result: string; reason: string }) => {
      if (data.gameId === gameId) {
        setGameStatus('completed');
        setResult(data.result);
      }
    };

    const handlePlayerDisconnected = (data: { userId: string; username: string }) => {
      console.log(`Player ${data.username} disconnected`);
    };

    const handlePlayerReconnected = (data: { userId: string; username: string }) => {
      console.log(`Player ${data.username} reconnected`);
    };

    const handleDrawOffered = (data: { gameId: string; offeredBy: string }) => {
      if (data.gameId === gameId) {
        console.log('Draw offered');
      }
    };

    on('move_made', handleMoveMade);
    on('game_over', handleGameOver);
    on('player_disconnected', handlePlayerDisconnected);
    on('player_reconnected', handlePlayerReconnected);
    on('draw_offered', handleDrawOffered);

    return () => {
      off('move_made', handleMoveMade);
      off('game_over', handleGameOver);
      off('player_disconnected', handlePlayerDisconnected);
      off('player_reconnected', handlePlayerReconnected);
      off('draw_offered', handleDrawOffered);
    };
  }, [gameId, on, off, updateFen, addMove, setGameStatus, setResult]);
};

