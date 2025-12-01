import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.userService.getUserProfile(id);
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: { username?: string },
  ) {
    return this.userService.update(user.id, updateData);
  }

  @Get('games')
  async getGameHistory(
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userService.getGameHistory(
      user.id,
      limit ? parseInt(limit) : 20,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('stats')
  async getStats(@CurrentUser() user: User) {
    return this.userService.getUserStatistics(user.id);
  }

  @Get('leaderboard')
  async getLeaderboard(@Query('limit') limit?: string) {
    return this.userService.getLeaderboard(limit ? parseInt(limit) : 100);
  }
}


