import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { GameModule } from '../game/game.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [forwardRef(() => GameModule), UserModule],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
