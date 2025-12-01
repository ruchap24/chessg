import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { createRedisClient } from '../../config/redis.config';
import { GameService } from '../game.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private redis = createRedisClient();
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  private chatRateLimitMap = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
    private gameService: GameService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`Connection rejected: User not found`);
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.data.user = user;
      await this.redis.set(`socket:${user.id}`, client.id, 'EX', 3600);
      const activeGame = await this.redis.get(`user_game:${user.id}`);
      if (activeGame) {
        await client.join(`game:${activeGame}`);
        await this.redis.del(`disconnected:${user.id}:${activeGame}`);
        
        const game = await this.gameService.getGame(activeGame);
        if (game) {
          client.emit('game_state_restored', {
            gameId: activeGame,
            game,
          });
        }

        this.server.to(`game:${activeGame}`).emit('player_reconnected', {
          userId: user.id,
          username: user.username,
        });
      }

      this.logger.log(`User ${user.username} (${user.id}) connected`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;
    await this.redis.del(`socket:${userId}`);
    const activeGame = await this.redis.get(`user_game:${userId}`);
    if (activeGame) {
      this.server.to(`game:${activeGame}`).emit('player_disconnected', {
        userId,
        username: client.data.user?.username,
      });
    }

    this.logger.log(`User ${userId} disconnected`);
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const game = await this.gameService.getGame(data.gameId);
      if (!game) {
        return { error: 'Game not found' };
      }

      if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
        return { error: 'Not a player in this game' };
      }

      await client.join(`game:${data.gameId}`);
      await this.redis.set(`user_game:${userId}`, data.gameId, 'EX', 3600);

      return { success: true, gameId: data.gameId };
    } catch (error) {
      this.logger.error(`Join game error: ${error.message}`);
      return { error: 'Failed to join game' };
    }
  }

  @SubscribeMessage('make_move')
  async handleMakeMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; move: string; promotion?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }
    if (!this.checkRateLimit(userId, 5, 10000)) {
      return { error: 'Rate limit exceeded. Please wait before making another move.' };
    }

    try {
      const result = await this.gameService.makeMove(
        data.gameId,
        userId,
        data.move,
        data.promotion,
      );

      if (result.error) {
        return result;
      }
      this.server.to(`game:${data.gameId}`).emit('move_made', {
        gameId: data.gameId,
        move: result.move,
        fen: result.fen,
        gameStatus: result.gameStatus,
        result: result.result,
      });

      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`Make move error: ${error.message}`);
      return { error: 'Failed to make move' };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; message: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }
    if (!this.checkChatRateLimit(userId, 10, 60000)) {
      return { error: 'Rate limit exceeded. Please wait before sending another message.' };
    }

    try {
      const chatMessage = await this.gameService.saveChatMessage(
        data.gameId,
        userId,
        data.message,
      );
      this.server.to(`game:${data.gameId}`).emit('chat_message', {
        gameId: data.gameId,
        message: chatMessage,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) return;
    client.to(`game:${data.gameId}`).emit('typing', {
      userId,
      username: client.data.user?.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('request_draw')
  async handleRequestDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await this.gameService.offerDraw(data.gameId, userId);
      this.server.to(`game:${data.gameId}`).emit('draw_offered', {
        gameId: data.gameId,
        offeredBy: userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Request draw error: ${error.message}`);
      return { error: 'Failed to request draw' };
    }
  }

  @SubscribeMessage('accept_draw')
  async handleAcceptDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.gameService.acceptDraw(data.gameId, userId);
      
      this.server.to(`game:${data.gameId}`).emit('game_over', {
        gameId: data.gameId,
        result: 'draw',
        reason: 'Draw accepted',
      });

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Accept draw error: ${error.message}`);
      return { error: 'Failed to accept draw' };
    }
  }

  @SubscribeMessage('resign')
  async handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const result = await this.gameService.resign(data.gameId, userId);
      
      this.server.to(`game:${data.gameId}`).emit('game_over', {
        gameId: data.gameId,
        result: result.result,
        reason: 'Player resigned',
      });

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Resign error: ${error.message}`);
      return { error: 'Failed to resign' };
    }
  }

  private extractToken(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                  client.handshake.headers?.authorization?.replace('Bearer ', '');
    return token || null;
  }

  private checkRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      this.rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }

  private checkChatRateLimit(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userLimit = this.chatRateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      this.chatRateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (userLimit.count >= maxRequests) {
      return false;
    }

    userLimit.count++;
    return true;
  }


  async broadcastToGame(gameId: string, event: string, data: any): Promise<void> {
    this.server.to(`game:${gameId}`).emit(event, data);
  }
}

