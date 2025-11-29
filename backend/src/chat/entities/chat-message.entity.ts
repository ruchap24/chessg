import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { Game } from '../../game/entities/game.entity';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'chat_messages' })
@Index('IDX_CHAT_MESSAGE_GAME_ID', ['gameId'])
@Index('IDX_CHAT_MESSAGE_USER_ID', ['userId'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Game, (game) => game.chatMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @RelationId((message: ChatMessage) => message.game)
  gameId: string;

  @ManyToOne(() => User, (user) => user.chatMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @RelationId((message: ChatMessage) => message.user)
  userId: string;

  @Column({ type: 'text' })
  message: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

