import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chess } from 'chess.js';
import { Game, GameStatus, GameResult } from './entities/game.entity';
import { Move } from './entities/move.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { UserService } from '../user/user.service';
import { createRedisClient } from '../config/redis.config';

@Injectable()
export class GameService {
  private redis = createRedisClient();

  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Move)
    private moveRepository: Repository<Move>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    private userService: UserService,
  ) {}

  async createGame(
    whiteId: string,
    blackId: string,
    isPrivate: boolean = false,
    roomCode?: string,
  ): Promise<Game> {
    const chess = new Chess();
    const initialFen = chess.fen();
    const game = this.gameRepository.create({
      whitePlayerId: whiteId,
      blackPlayerId: blackId,
      status: GameStatus.IN_PROGRESS,
      currentFen: initialFen,
      isPrivate,
      roomCode,
      lastMoveAt: new Date(),
    });

    const savedGame = await this.gameRepository.save(game);
    await this.cacheGameState(savedGame.id, {
      fen: initialFen,
      pgn: '',
      status: savedGame.status,
    });
    return savedGame;
  }

  async getGame(gameId: string): Promise<Game | null> {
    const cached = await this.redis.get(`game:${gameId}`);
    if (cached) {
      const gameData = JSON.parse(cached);
      const game = await this.gameRepository.findOne({
        where: { id: gameId },
        relations: ['whitePlayer', 'blackPlayer'],
      });
      if (game) {
        return { ...game, ...gameData };
      }
    }
    return this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['whitePlayer', 'blackPlayer'],
    });
  }
  async makeMove(
    gameId: string,
    userId: string,
    moveNotation: string,
    promotion?: string,
  ): Promise<{ move?: Move; fen?: string; gameStatus?: GameStatus; result?: GameResult | null; error?: string }> {
    const game = await this.getGame(gameId);
    if (!game) {
      return { error: 'Game not found' };
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      return { error: 'Game is not in progress' };
    }
    const chess = new Chess(game.currentFen);
    const isWhiteTurn = chess.turn() === 'w';
    const isPlayerWhite = game.whitePlayerId === userId;

    if (isWhiteTurn !== isPlayerWhite) {
      return { error: 'Not your turn' };
    }
    let move;
    try {
      if (promotion) {
        move = chess.move({
          from: moveNotation.substring(0, 2),
          to: moveNotation.substring(2, 4),
          promotion: promotion.toLowerCase(),
        });
      } else {
        move = chess.move(moveNotation);
      }

      if (!move) {
        return { error: 'Invalid move' };
      }
    } catch (error) {
      return { error: 'Invalid move' };
    }
    const moveEntity = this.moveRepository.create({
      gameId: game.id,
      playerId: userId,
      moveNotation: move.san,
      fen: chess.fen(),
      moveNumber: chess.history().length,
    });
    const savedMove = await this.moveRepository.save(moveEntity);
    game.currentFen = chess.fen();
    game.pgn = chess.pgn();
    game.lastMoveAt = new Date();
    let gameStatus = GameStatus.IN_PROGRESS;
    let result: GameResult | null = null;
    if (chess.isCheckmate()) {
      gameStatus = GameStatus.COMPLETED;
      result = isPlayerWhite ? GameResult.WHITE_WIN : GameResult.BLACK_WIN;
      game.result = result;
      game.completedAt = new Date();
      await this.updateEloRatings(game, result);
    } else if (chess.isStalemate() || chess.isDraw()) {
      gameStatus = GameStatus.COMPLETED;
      result = GameResult.DRAW;
      game.result = result;
      game.completedAt = new Date();
      await this.updateEloRatings(game, result);
    }

    game.status = gameStatus;
    await this.gameRepository.save(game);
    await this.cacheGameState(game.id, {
      fen: chess.fen(),
      pgn: chess.pgn(),
      status: gameStatus,
    });
    return {
      move: savedMove,
      fen: chess.fen(),
      gameStatus,
      result,
    };
  }

  async resign(gameId: string, userId: string): Promise<{ result: GameResult }> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new BadRequestException('Game is not in progress');
    }
    const isPlayerWhite = game.whitePlayerId === userId;
    const result = isPlayerWhite ? GameResult.BLACK_WIN : GameResult.WHITE_WIN;
    game.status = GameStatus.COMPLETED;
    game.result = result;
    game.completedAt = new Date();
    await this.gameRepository.save(game);
    await this.updateEloRatings(game, result);
    return { result };
  }
  async offerDraw(gameId: string, userId: string): Promise<void> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    await this.redis.setex(`draw_offer:${gameId}`, 30, userId);
  }
  async acceptDraw(gameId: string, userId: string): Promise<{ result: GameResult }> {
    const game = await this.getGame(gameId);
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    const drawOffer = await this.redis.get(`draw_offer:${gameId}`);
    if (!drawOffer || drawOffer === userId) {
      throw new BadRequestException('No active draw offer from opponent');
    }
    game.status = GameStatus.COMPLETED;
    game.result = GameResult.DRAW;
    game.completedAt = new Date();
    await this.gameRepository.save(game);
    await this.redis.del(`draw_offer:${gameId}`);
    await this.updateEloRatings(game, GameResult.DRAW);
    return { result: GameResult.DRAW };
  }

  async getMoves(gameId: string): Promise<Move[]> {
    return this.moveRepository.find({
      where: { gameId },
      order: { moveNumber: 'ASC' },
      relations: ['player'],
    });
  }
  async saveChatMessage(gameId: string, userId: string, message: string): Promise<ChatMessage> {
    const profanityWords = ['badword1', 'badword2'];
    let filtered = message;
    profanityWords.forEach((word) => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    const chatMessage = this.chatMessageRepository.create({
      gameId,
      userId,
      message: filtered,
    });
    const saved = await this.chatMessageRepository.save(chatMessage);
    await this.redis.lpush(`chat:${gameId}`, JSON.stringify(saved));
    await this.redis.ltrim(`chat:${gameId}`, 0, 49); 
    await this.redis.expire(`chat:${gameId}`, 3600);
    return saved;
  }

  async getChatMessages(gameId: string): Promise<ChatMessage[]> {
    const cached = await this.redis.lrange(`chat:${gameId}`, 0, -1);
    if (cached && cached.length > 0) {
      return cached.map((msg) => JSON.parse(msg));
    }
    return this.chatMessageRepository.find({
      where: { gameId },
      order: { createdAt: 'ASC' },
      relations: ['user'],
      take: 50,
    });
  }

  private async updateEloRatings(game: Game, result: GameResult): Promise<void> {
    const whitePlayer = await this.userService.findById(game.whitePlayerId);
    const blackPlayer = await this.userService.findById(game.blackPlayerId);
    if (!whitePlayer || !blackPlayer) return;
    const whiteElo = whitePlayer.eloRating;
    const blackElo = blackPlayer.eloRating;
    let whiteNewElo: number;
    let blackNewElo: number;
    if (result === GameResult.DRAW) {
      const eloChange = this.calculateEloChange(whiteElo, blackElo, true);
      whiteNewElo = whiteElo + eloChange;
      blackNewElo = blackElo - eloChange;
    } else if (result === GameResult.WHITE_WIN) {
      const eloChange = this.calculateEloChange(whiteElo, blackElo, false);
      whiteNewElo = whiteElo + eloChange;
      blackNewElo = blackElo - eloChange;
    } else {
      const eloChange = this.calculateEloChange(blackElo, whiteElo, false);
      blackNewElo = blackElo + eloChange;
      whiteNewElo = whiteElo - eloChange;
    }
    await this.userService.updateElo(game.whitePlayerId, Math.round(whiteNewElo));
    await this.userService.updateElo(game.blackPlayerId, Math.round(blackNewElo));
    await this.userService.incrementGamesPlayed(game.whitePlayerId);
    await this.userService.incrementGamesPlayed(game.blackPlayerId);
    if (result === GameResult.WHITE_WIN) {
      await this.userService.incrementGamesWon(game.whitePlayerId);
    } else if (result === GameResult.BLACK_WIN) {
      await this.userService.incrementGamesWon(game.blackPlayerId);
    }
  }

  private calculateEloChange(winnerElo: number, loserElo: number, isDraw: boolean): number {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const actualScore = isDraw ? 0.5 : 1;
    return K * (actualScore - expectedScore);
  }

  private async cacheGameState(gameId: string, state: { fen: string; pgn: string; status: GameStatus }): Promise<void> {
    await this.redis.setex(`game:${gameId}`, 3600, JSON.stringify(state));
  }
}

