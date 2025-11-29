import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Move } from './move.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';

export enum GameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export enum GameResult {
  WHITE_WIN = 'white_win',
  BLACK_WIN = 'black_win',
  DRAW = 'draw',
}

@Entity({ name: 'games' })
@Index('IDX_GAME_STATUS', ['status'])
@Index('IDX_GAME_ROOM_CODE', ['roomCode'])
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.whiteGames, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'white_player_id' })
  whitePlayer: User;

  @RelationId((game: Game) => game.whitePlayer)
  whitePlayerId: string;

  @ManyToOne(() => User, (user) => user.blackGames, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'black_player_id' })
  blackPlayer: User;

  @RelationId((game: Game) => game.blackPlayer)
  blackPlayerId: string;

  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.WAITING,
  })
  status: GameStatus;

  @Column({
    type: 'enum',
    enum: GameResult,
    nullable: true,
  })
  result?: GameResult | null;

  @Column({ type: 'text', nullable: true })
  pgn?: string | null;

  @Column({ type: 'text' })
  currentFen: string;

  @Column({ nullable: true })
  roomCode?: string | null;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastMoveAt?: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date | null;

  @OneToMany(() => Move, (move) => move.game)
  moves: Move[];

  @OneToMany(() => ChatMessage, (message) => message.game)
  chatMessages: ChatMessage[];
}

