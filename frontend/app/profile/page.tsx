'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import ProtectedRoute from '../../components/ProtectedRoute';
import StatCard from '../../components/StatCard';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  eloRating: number;
  gamesPlayed: number;
  gamesWon: number;
  isGuest: boolean;
}

interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageGameLength: number;
  currentStreak: number;
  bestStreak: number;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = (params.id as string) || currentUser?.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, statsRes, gamesRes] = await Promise.all([
          api.get(`/user/profile/${userId}`),
          api.get('/user/stats'),
          api.get('/user/games?limit=10'),
        ]);

        setProfile(profileRes.data);
        setStats(statsRes.data);
        setGameHistory(gamesRes.data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!profile) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="text-white">Profile not found</div>
        </div>
      </ProtectedRoute>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
                <p className="text-white/70">{profile.email}</p>
              </div>
              <div className="text-right">
                <div className="text-white/70 text-sm mb-1">ELO Rating</div>
                <div className="text-4xl font-bold text-yellow-400">{profile.eloRating}</div>
              </div>
            </div>
            {isOwnProfile && (
              <button
                onClick={() => router.push('/profile/edit')}
                className="bg-white/10 text-white font-semibold py-2 px-4 rounded-lg border border-white/20 hover:bg-white/20 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard title="Total Games" value={stats.totalGames} icon="🎮" color="purple" />
              <StatCard title="Win Rate" value={`${stats.winRate}%`} icon="🏆" color="green" />
              <StatCard title="Wins" value={stats.wins} icon="✅" color="blue" />
              <StatCard title="Current Streak" value={stats.currentStreak} icon="🔥" color="orange" />
            </div>
          )}

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Games</h2>
            <div className="space-y-2">
              {gameHistory.map((game) => (
                <div
                  key={game.id}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => router.push(`/game/${game.id}`)}
                >
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <div className="font-semibold">
                        vs {game.whitePlayerId === userId ? game.blackPlayer?.username : game.whitePlayer?.username}
                      </div>
                      <div className="text-sm text-white/70">
                        {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded ${
                      game.result === 'draw' ? 'bg-yellow-600' :
                      (game.result === 'white_win' && game.whitePlayerId === userId) ||
                      (game.result === 'black_win' && game.blackPlayerId === userId)
                        ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {game.result === 'draw' ? 'Draw' :
                       (game.result === 'white_win' && game.whitePlayerId === userId) ||
                       (game.result === 'black_win' && game.blackPlayerId === userId)
                         ? 'Win' : 'Loss'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


