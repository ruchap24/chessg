import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { GameService } from './game.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';

@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Get('active')
  async getActiveGame(@CurrentUser() user: User) {
    return this.gameService.getActiveGame(user.id);
  }

  @Get(':id')
  async getGame(@Param('id') id: string) {
    return this.gameService.getGame(id);
  }

  @Post(':id/move')
  async makeMove(
    @Param('id') gameId: string,
    @CurrentUser() user: User,
    @Body() body: { move: string; promotion?: string },
  ) {
    return this.gameService.makeMove(gameId, user.id, body.move, body.promotion);
  }

  @Post(':id/resign')
  async resign(@Param('id') gameId: string, @CurrentUser() user: User) {
    return this.gameService.resign(gameId, user.id);
  }

  @Post(':id/draw-offer')
  async offerDraw(@Param('id') gameId: string, @CurrentUser() user: User) {
    await this.gameService.offerDraw(gameId, user.id);
    return { success: true };
  }

  @Post(':id/draw-accept')
  async acceptDraw(@Param('id') gameId: string, @CurrentUser() user: User) {
    return this.gameService.acceptDraw(gameId, user.id);
  }

  @Get(':id/moves')
  async getMoves(@Param('id') id: string) {
    return this.gameService.getMoves(id);
  }
}
