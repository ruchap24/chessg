import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Game, GameResult } from '../game/entities/game.entity';
import { createRedisClient } from '../config/redis.config';

@Injectable()
export class UserService {
  private redis = createRedisClient();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { googleId } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  async updateElo(id: string, newElo: number): Promise<void> {
    await this.userRepository.update(id, { eloRating: newElo });
  }

  async incrementGamesPlayed(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'gamesPlayed', 1);
  }

  async incrementGamesWon(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'gamesWon', 1);
  }

  async getUserProfile(userId: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['whiteGames', 'blackGames'],
    });
  }

  async getGameHistory(userId: string, limit: number = 20, offset: number = 0): Promise<Game[]> {
    return this.gameRepository.find({
      where: [
        { whitePlayerId: userId },
        { blackPlayerId: userId },
      ],
      relations: ['whitePlayer', 'blackPlayer'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getUserStatistics(userId: string): Promise<any> {
    const games = await this.gameRepository.find({
      where: [
        { whitePlayerId: userId, status: 'completed' },
        { blackPlayerId: userId, status: 'completed' },
      ],
    });

    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalGameLength = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    let lastResult: 'win' | 'loss' | 'draw' | null = null;

    for (const game of games) {
      const isWhite = game.whitePlayerId === userId;
      let result: 'win' | 'loss' | 'draw' | null = null;

      if (game.result === GameResult.DRAW) {
        draws++;
        result = 'draw';
      } else if (
        (game.result === GameResult.WHITE_WIN && isWhite) ||
        (game.result === GameResult.BLACK_WIN && !isWhite)
      ) {
        wins++;
        result = 'win';
      } else {
        losses++;
        result = 'loss';
      }

      if (game.completedAt && game.createdAt) {
        totalGameLength += game.completedAt.getTime() - game.createdAt.getTime();
      }

      if (result === lastResult || lastResult === null) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
      lastResult = result;
    }

    bestStreak = Math.max(bestStreak, tempStreak);
    currentStreak = tempStreak;

    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const avgGameLength = totalGames > 0 ? totalGameLength / totalGames / 1000 / 60 : 0;

    return {
      totalGames,
      wins,
      losses,
      draws,
      winRate: Math.round(winRate * 10) / 10,
      averageGameLength: Math.round(avgGameLength),
      currentStreak,
      bestStreak,
    };
  }

  async getLeaderboard(limit: number = 100): Promise<User[]> {
    const cached = await this.redis.get('leaderboard');
    if (cached) {
      return JSON.parse(cached);
    }

    const users = await this.userRepository.find({
      where: { isBot: false },
      order: { eloRating: 'DESC' },
      take: limit,
    });

    await this.redis.setex('leaderboard', 300, JSON.stringify(users));
    return users;
  }
}
