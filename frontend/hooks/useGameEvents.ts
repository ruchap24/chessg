import { useEffect, useState } from 'react';
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

    const handleBotThinking = () => {
      // Bot thinking indicator would be set here if needed
    };

    const handleGameOver = (data: { gameId: string; result: string; reason: string; eloChange?: number }) => {
      if (data.gameId === gameId) {
        setGameStatus('completed');
        setResult(data.result);
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('game_over', { detail: { result: data.result, reason: data.reason, eloChange: data.eloChange } });
          window.dispatchEvent(event);
        }
      }
    };

    const handlePlayerDisconnected = (data: { userId: string; username: string; gameId?: string }) => {
      if (!data.gameId || data.gameId === gameId) {
        setOpponentDisconnected(true);
      }
    };

    const handlePlayerReconnected = (data: { userId: string; username: string; gameId?: string }) => {
      if (!data.gameId || data.gameId === gameId) {
        setOpponentDisconnected(false);
      }
    };

    const handleGameStateRestored = (data: { gameId: string; game: any }) => {
      if (data.gameId === gameId) {
        updateGame(data.game);
      }
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
    on('game_state_restored', handleGameStateRestored);
    on('draw_offered', handleDrawOffered);

    return () => {
      off('move_made', handleMoveMade);
      off('game_over', handleGameOver);
      off('player_disconnected', handlePlayerDisconnected);
      off('player_reconnected', handlePlayerReconnected);
      off('game_state_restored', handleGameStateRestored);
      off('draw_offered', handleDrawOffered);
    };
  }, [gameId, on, off, updateFen, addMove, setGameStatus, setResult, updateGame]);

  return { opponentDisconnected };
};

