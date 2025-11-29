import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { createRedisClient } from '../config/redis.config';
import { GameService } from '../game/game.service';
import { UserService } from '../user/user.service';
import { GameGateway } from '../game/gateways/game.gateway';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private redis = createRedisClient();
  private readonly QUEUE_KEY = 'matchmaking:queue';
  private readonly PRIVATE_ROOMS_KEY = 'matchmaking:private_rooms';
  private readonly USER_SEARCH_START_KEY = 'matchmaking:search_start:';

  constructor(
    @Inject(forwardRef(() => GameService))
    private gameService: GameService,
    private userService: UserService,
    @Inject(forwardRef(() => GameGateway))
    private gameGateway: GameGateway,
  ) {}

  async addToQueue(userId: string, eloRating: number): Promise<void> {
    await this.redis.zadd(this.QUEUE_KEY, eloRating, userId);
    await this.redis.setex(`${this.USER_SEARCH_START_KEY}${userId}`, 300, Date.now().toString());
    this.logger.log(`User ${userId} added to matchmaking queue with ELO ${eloRating}`);
  }

  async removeFromQueue(userId: string): Promise<void> {
    await this.redis.zrem(this.QUEUE_KEY, userId);
    await this.redis.del(`${this.USER_SEARCH_START_KEY}${userId}`);
    this.logger.log(`User ${userId} removed from matchmaking queue`);
  }

  async findMatch(userId: string, eloRating: number): Promise<string | null> {
    const searchStart = await this.redis.get(`${this.USER_SEARCH_START_KEY}${userId}`);
    if (!searchStart) {
      return null; 
    }

    const searchDuration = Date.now() - parseInt(searchStart);
    const secondsInQueue = Math.floor(searchDuration / 1000);
    let eloRange = 100;
    if (secondsInQueue >= 20) {
      eloRange = 500;
    } else if (secondsInQueue >= 15) {
      eloRange = 400;
    } else if (secondsInQueue >= 10) {
      eloRange = 300;
    } else if (secondsInQueue >= 5) {
      eloRange = 200;
    }

    const minElo = eloRating - eloRange;
    const maxElo = eloRating + eloRange;
    const candidates = await this.redis.zrangebyscore(
      this.QUEUE_KEY,
      minElo,
      maxElo,
      'LIMIT',
      0,
      10,
    );
    for (const candidateId of candidates) {
      if (candidateId !== userId) {
        return candidateId;
      }
    }
    if (secondsInQueue >= 30) {
      const allCandidates = await this.redis.zrange(this.QUEUE_KEY, 0, 10);
      for (const candidateId of allCandidates) {
        if (candidateId !== userId) {
          return candidateId;
        }
      }
    }
    return null;
  }

  async processMatchmakingQueue(): Promise<void> {
    const queueSize = await this.redis.zcard(this.QUEUE_KEY);
    if (queueSize < 2) {
    }

    const players = await this.redis.zrange(this.QUEUE_KEY, 0, -1, 'WITHSCORES');
    for (let i = 0; i < players.length - 1; i += 2) {
      const player1Id = players[i];
      const player1Elo = parseFloat(players[i + 1]);
      const player2Id = players[i + 2];
      const player2Elo = parseFloat(players[i + 3]);

      if (!player1Id || !player2Id) break;
      const match = await this.findMatch(player1Id, player1Elo);
      if (match && match === player2Id) {
        try {
          const game = await this.gameService.createGame(player1Id, player2Id, false);
          await this.removeFromQueue(player1Id);
          await this.removeFromQueue(player2Id);
          this.gameGateway.broadcastToGame(game.id, 'match_found', {
            gameId: game.id,
            whitePlayer: player1Id,
            blackPlayer: player2Id,
          });
          this.logger.log(`Matched players ${player1Id} and ${player2Id} in game ${game.id}`);
        } catch (error) {
          this.logger.error(`Error creating game: ${error.message}`);
        }
      }
    }
  }

  async generateRoomCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  async createPrivateRoom(userId: string): Promise<string> {
    let roomCode: string;
    let exists = true;
    while (exists) {
      roomCode = await this.generateRoomCode();
      const existing = await this.redis.get(`${this.PRIVATE_ROOMS_KEY}:${roomCode}`);
      if (!existing) {
        exists = false;
      }
    }
    await this.redis.setex(`${this.PRIVATE_ROOMS_KEY}:${roomCode}`, 3600, userId);
    this.logger.log(`Created private room ${roomCode} for user ${userId}`);
    return roomCode;
  }

  async joinPrivateRoom(userId: string, roomCode: string): Promise<{ success: boolean; gameId?: string }> {
    const roomOwner = await this.redis.get(`${this.PRIVATE_ROOMS_KEY}:${roomCode}`);
    
    if (!roomOwner) {
      return { success: false };
    }

    if (roomOwner === userId) {
      return { success: false };
    }
    const game = await this.gameService.createGame(roomOwner, userId, true, roomCode);
    await this.redis.del(`${this.PRIVATE_ROOMS_KEY}:${roomCode}`);
    this.gameGateway.broadcastToGame(game.id, 'match_found', {
      gameId: game.id,
      whitePlayer: roomOwner,
      blackPlayer: userId,
    });

    return { success: true, gameId: game.id };
  }

  async getQueueStatus(userId: string): Promise<{ inQueue: boolean; queueSize: number; waitTime?: number }> {
    const inQueue = await this.redis.zscore(this.QUEUE_KEY, userId) !== null;
    const queueSize = await this.redis.zcard(this.QUEUE_KEY);
    
    let waitTime: number | undefined;
    if (inQueue) {
      const searchStart = await this.redis.get(`${this.USER_SEARCH_START_KEY}${userId}`);
      if (searchStart) {
        waitTime = Math.floor((Date.now() - parseInt(searchStart)) / 1000);
      }
    }

    return { inQueue, queueSize, waitTime };
  }
}

