import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from '../../game/entities/game.entity';
import { Move } from '../../game/entities/move.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true })
  password?: string | null;

  @Column({ nullable: true })
  googleId?: string | null;

  @Column({ type: 'int', default: 1200 })
  eloRating: number;

  @Column({ type: 'int', default: 0 })
  gamesPlayed: number;

  @Column({ type: 'int', default: 0 })
  gamesWon: number;

  @Column({ type: 'boolean', default: false })
  isGuest: boolean;

  @Column({ type: 'boolean', default: false })
  isBot: boolean;

  @OneToMany(() => Game, (game) => game.whitePlayer)
  whiteGames: Game[];

  @OneToMany(() => Game, (game) => game.blackPlayer)
  blackGames: Game[];

  @OneToMany(() => Move, (move) => move.player)
  moves: Move[];

  @OneToMany(() => ChatMessage, (message) => message.user)
  chatMessages: ChatMessage[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

