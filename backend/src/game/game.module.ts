import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Move } from './entities/move.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './gateways/game.gateway';
import { UserModule } from '../user/user.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Move, ChatMessage]),
    UserModule,
    forwardRef(() => BotModule),
  ],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameService, GameGateway],
})
export class GameModule {}
