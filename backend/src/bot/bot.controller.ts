import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BotService, BotDifficulty } from './bot.service';
import { GameService } from '../game/game.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('bot')
export class BotController {
  constructor(
    private botService: BotService,
    private gameService: GameService,
  ) {}

  @Post('game/create')
  async createBotGame(
    @CurrentUser() user: User,
    @Body() body: { difficulty: BotDifficulty; playerColor?: 'white' | 'black' },
  ) {
    const difficulty = body.difficulty || BotDifficulty.MEDIUM;
    const playerColor = body.playerColor || 'white';

    const game = await this.gameService.createBotGame(user.id, difficulty, playerColor);

    return {
      success: true,
      gameId: game.id,
      game,
    };
  }
}
