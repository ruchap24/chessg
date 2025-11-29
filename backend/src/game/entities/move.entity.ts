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
import { Game } from './game.entity';
import { User } from '../../user/entities/user.entity';

@Entity({ name: 'moves' })
@Index('IDX_MOVE_GAME_ID', ['gameId'])
@Index('IDX_MOVE_PLAYER_ID', ['playerId'])
export class Move {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Game, (game) => game.moves, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'game_id' })
  game: Game;

  @RelationId((move: Move) => move.game)
  gameId: string;

  @ManyToOne(() => User, (user) => user.moves, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'player_id' })
  player: User;

  @RelationId((move: Move) => move.player)
  playerId: string;

  @Column({ length: 10 })
  moveNotation: string;

  @Column({ type: 'text' })
  fen: string;

  @Column({ type: 'int' })
  moveNumber: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

