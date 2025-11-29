import { Controller, Post, Delete, Get, UseGuards, Body } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('matchmaking')
export class MatchmakingController {
  constructor(private matchmakingService: MatchmakingService) {}

  @Post('queue')
  async joinQueue(@CurrentUser() user: User) {
    await this.matchmakingService.addToQueue(user.id, user.eloRating);
    return { success: true, message: 'Joined matchmaking queue' };
  }

  @Delete('queue')
  async leaveQueue(@CurrentUser() user: User) {
    await this.matchmakingService.removeFromQueue(user.id);
    return { success: true, message: 'Left matchmaking queue' };
  }

  @Post('private/create')
  async createPrivateRoom(@CurrentUser() user: User) {
    const roomCode = await this.matchmakingService.createPrivateRoom(user.id);
    return { success: true, roomCode };
  }

  @Post('private/join')
  async joinPrivateRoom(
    @CurrentUser() user: User,
    @Body('roomCode') roomCode: string,
  ) {
    const result = await this.matchmakingService.joinPrivateRoom(user.id, roomCode);
    if (!result.success) {
      return { success: false, message: 'Invalid room code or room not found' };
    }
    return { success: true, gameId: result.gameId };
  }

  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    return this.matchmakingService.getQueueStatus(user.id);
  }
}

