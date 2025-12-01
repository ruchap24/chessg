'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';

interface LeaderboardEntry {
  id: string;
  username: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const response = await api.get('/user/leaderboard');
        setLeaderboard(response.data);
      } catch (error) {
        console.error('Failed to load leaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, []);

  const getWinRate = (gamesPlayed: number, gamesWon: number) => {
    return gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">Leaderboard</h1>
            
            {isLoading ? (
              <div className="text-white text-center">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left text-white/70 py-4 px-4">Rank</th>
                      <th className="text-left text-white/70 py-4 px-4">Player</th>
                      <th className="text-left text-white/70 py-4 px-4">ELO</th>
                      <th className="text-left text-white/70 py-4 px-4">Games</th>
                      <th className="text-left text-white/70 py-4 px-4">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`border-b border-white/10 hover:bg-white/5 ${
                          entry.id === user?.id ? 'bg-purple-600/20' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-white font-semibold">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `#${index + 1}`}
                        </td>
                        <td className="py-4 px-4 text-white">{entry.username}</td>
                        <td className="py-4 px-4 text-yellow-400 font-semibold">{entry.eloRating}</td>
                        <td className="py-4 px-4 text-white/70">{entry.gamesPlayed}</td>
                        <td className="py-4 px-4 text-white/70">{getWinRate(entry.gamesPlayed, entry.gamesWon)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


