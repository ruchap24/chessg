import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from './entities/game.entity';
import { Move } from './entities/move.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './gateways/game.gateway';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, Move, ChatMessage]),
    UserModule,
  ],
  providers: [GameService, GameGateway],
  controllers: [GameController],
  exports: [GameService, GameGateway],
})
export class GameModule {}
