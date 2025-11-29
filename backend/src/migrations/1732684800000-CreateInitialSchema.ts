import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

const gamesWhitePlayerForeignKey = new TableForeignKey({
  name: 'FK_games_white_player',
  columnNames: ['white_player_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'CASCADE',
});

const gamesBlackPlayerForeignKey = new TableForeignKey({
  name: 'FK_games_black_player',
  columnNames: ['black_player_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'CASCADE',
});

const movesGameForeignKey = new TableForeignKey({
  name: 'FK_moves_game',
  columnNames: ['game_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'games',
  onDelete: 'CASCADE',
});

const movesPlayerForeignKey = new TableForeignKey({
  name: 'FK_moves_player',
  columnNames: ['player_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'SET NULL',
});

const chatMessagesGameForeignKey = new TableForeignKey({
  name: 'FK_chat_messages_game',
  columnNames: ['game_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'games',
  onDelete: 'CASCADE',
});

const chatMessagesUserForeignKey = new TableForeignKey({
  name: 'FK_chat_messages_user',
  columnNames: ['user_id'],
  referencedColumnNames: ['id'],
  referencedTableName: 'users',
  onDelete: 'CASCADE',
});

const gameStatusIndex = new TableIndex({
  name: 'IDX_GAME_STATUS',
  columnNames: ['status'],
});

const gameRoomCodeIndex = new TableIndex({
  name: 'IDX_GAME_ROOM_CODE',
  columnNames: ['roomCode'],
});

const moveGameIndex = new TableIndex({
  name: 'IDX_MOVE_GAME_ID',
  columnNames: ['game_id'],
});

const movePlayerIndex = new TableIndex({
  name: 'IDX_MOVE_PLAYER_ID',
  columnNames: ['player_id'],
});

const chatMessageGameIndex = new TableIndex({
  name: 'IDX_CHAT_MESSAGE_GAME_ID',
  columnNames: ['game_id'],
});

const chatMessageUserIndex = new TableIndex({
  name: 'IDX_CHAT_MESSAGE_USER_ID',
  columnNames: ['user_id'],
});

export class CreateInitialSchema1732684800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'username', type: 'varchar', isUnique: true },
          { name: 'password', type: 'varchar', isNullable: true },
          { name: 'googleId', type: 'varchar', isNullable: true },
          { name: 'eloRating', type: 'int', default: '1200' },
          { name: 'gamesPlayed', type: 'int', default: '0' },
          { name: 'gamesWon', type: 'int', default: '0' },
          { name: 'isGuest', type: 'boolean', default: false },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'games',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'white_player_id', type: 'uuid' },
          { name: 'black_player_id', type: 'uuid' },
          { name: 'status', type: 'varchar', default: `'waiting'` },
          { name: 'result', type: 'varchar', isNullable: true },
          { name: 'pgn', type: 'text', isNullable: true },
          { name: 'currentFen', type: 'text' },
          { name: 'roomCode', type: 'varchar', isNullable: true },
          { name: 'isPrivate', type: 'boolean', default: false },
          { name: 'lastMoveAt', type: 'timestamptz', isNullable: true },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
          { name: 'completedAt', type: 'timestamptz', isNullable: true },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'moves',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'game_id', type: 'uuid' },
          { name: 'player_id', type: 'uuid', isNullable: true },
          { name: 'moveNotation', type: 'varchar' },
          { name: 'fen', type: 'text' },
          { name: 'moveNumber', type: 'int' },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'game_id', type: 'uuid' },
          { name: 'user_id', type: 'uuid' },
          { name: 'message', type: 'text' },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('games', [
      gamesWhitePlayerForeignKey,
      gamesBlackPlayerForeignKey,
    ]);

    await queryRunner.createForeignKeys('moves', [
      movesGameForeignKey,
      movesPlayerForeignKey,
    ]);

    await queryRunner.createForeignKeys('chat_messages', [
      chatMessagesGameForeignKey,
      chatMessagesUserForeignKey,
    ]);

    await queryRunner.createIndices('games', [
      gameStatusIndex,
      gameRoomCodeIndex,
    ]);
    await queryRunner.createIndices('moves', [
      moveGameIndex,
      movePlayerIndex,
    ]);
    await queryRunner.createIndices('chat_messages', [
      chatMessageGameIndex,
      chatMessageUserIndex,
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndices('chat_messages', [
      chatMessageUserIndex,
      chatMessageGameIndex,
    ]);
    await queryRunner.dropIndices('moves', [movePlayerIndex, moveGameIndex]);
    await queryRunner.dropIndices('games', [
      gameRoomCodeIndex,
      gameStatusIndex,
    ]);

    await queryRunner.dropForeignKeys('chat_messages', [
      chatMessagesUserForeignKey,
      chatMessagesGameForeignKey,
    ]);
    await queryRunner.dropForeignKeys('moves', [
      movesPlayerForeignKey,
      movesGameForeignKey,
    ]);
    await queryRunner.dropForeignKeys('games', [
      gamesBlackPlayerForeignKey,
      gamesWhitePlayerForeignKey,
    ]);

    await queryRunner.dropTable('chat_messages');
    await queryRunner.dropTable('moves');
    await queryRunner.dropTable('games');
    await queryRunner.dropTable('users');
  }
}

