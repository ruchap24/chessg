import { Injectable, Logger } from '@nestjs/common';
import { Chess, Square } from 'chess.js';

export enum BotDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

interface MoveEvaluation {
  move: string;
  score: number;
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  // Piece values for evaluation
  private readonly PIECE_VALUES = {
    p: 1, // Pawn
    n: 3, // Knight
    b: 3, // Bishop
    r: 5, // Rook
    q: 9, // Queen
    k: 1000, // King (very high to avoid losing it)
  };

  async playMove(fen: string, difficulty: BotDifficulty): Promise<string> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });

    if (legalMoves.length === 0) {
      throw new Error('No legal moves available');
    }

    let move: string;

    switch (difficulty) {
      case BotDifficulty.EASY:
        move = this.getRandomMove(legalMoves);
        break;
      case BotDifficulty.MEDIUM:
        move = this.getMediumMove(chess, legalMoves);
        break;
      case BotDifficulty.HARD:
        move = this.getHardMove(chess, legalMoves, 3);
        break;
      case BotDifficulty.EXPERT:
        move = this.getExpertMove(chess, legalMoves, 5);
        break;
      default:
        move = this.getRandomMove(legalMoves);
    }

    // Add slight randomness to make it less predictable (except for easy)
    if (difficulty !== BotDifficulty.EASY && Math.random() < 0.1) {
      const randomMove = this.getRandomMove(legalMoves);
      if (this.evaluateMove(chess, randomMove) > this.evaluateMove(chess, move) * 0.7) {
        move = randomMove;
      }
    }

    return move;
  }

  getThinkingDelay(difficulty: BotDifficulty): number {
    switch (difficulty) {
      case BotDifficulty.EASY:
        return 500 + Math.random() * 500; // 500-1000ms
      case BotDifficulty.MEDIUM:
        return 800 + Math.random() * 700; // 800-1500ms
      case BotDifficulty.HARD:
        return 1200 + Math.random() * 800; // 1200-2000ms
      case BotDifficulty.EXPERT:
        return 1500 + Math.random() * 1000; // 1500-2500ms
      default:
        return 1000;
    }
  }

  private getRandomMove(legalMoves: any[]): string {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    return legalMoves[randomIndex].san;
  }

  private getMediumMove(chess: Chess, legalMoves: any[]): string {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      const score = this.evaluateMove(chess, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.san;
  }

  private getHardMove(chess: Chess, legalMoves: any[], depth: number): string {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;

    for (const move of legalMoves) {
      chess.move(move);
      const score = -this.minimax(chess, depth - 1, false);
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.san;
  }

  private getExpertMove(chess: Chess, legalMoves: any[], depth: number): string {
    let bestMove = legalMoves[0];
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of legalMoves) {
      chess.move(move);
      const score = -this.minimaxAlphaBeta(chess, depth - 1, -beta, -alpha, false);
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }

      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        break; // Alpha-beta pruning
      }
    }

    return bestMove.san;
  }

  private minimax(chess: Chess, depth: number, maximizing: boolean): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }

    const legalMoves = chess.moves({ verbose: true });

    if (maximizing) {
      let maxScore = -Infinity;
      for (const move of legalMoves) {
        chess.move(move);
        const score = this.minimax(chess, depth - 1, false);
        chess.undo();
        maxScore = Math.max(maxScore, score);
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of legalMoves) {
        chess.move(move);
        const score = this.minimax(chess, depth - 1, true);
        chess.undo();
        minScore = Math.min(minScore, score);
      }
      return minScore;
    }
  }

  private minimaxAlphaBeta(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
  ): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }

    const legalMoves = chess.moves({ verbose: true });

    if (maximizing) {
      let maxScore = -Infinity;
      for (const move of legalMoves) {
        chess.move(move);
        const score = this.minimaxAlphaBeta(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (alpha >= beta) {
          break; // Alpha-beta pruning
        }
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (const move of legalMoves) {
        chess.move(move);
        const score = this.minimaxAlphaBeta(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (alpha >= beta) {
          break; // Alpha-beta pruning
        }
      }
      return minScore;
    }
  }

  private evaluateMove(chess: Chess, move: any): number {
    let score = 0;

    // Make the move temporarily
    chess.move(move);

    // Evaluate the position after the move
    score = this.evaluatePosition(chess);

    // Undo the move
    chess.undo();

    return score;
  }

  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -10000 : 10000;
    }

    if (chess.isDraw() || chess.isStalemate()) {
      return 0;
    }

    if (chess.isCheck()) {
      return chess.turn() === 'w' ? -50 : 50;
    }

    let score = 0;
    const board = chess.board();

    // Material count
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece) {
          const value = this.PIECE_VALUES[piece.type];
          score += piece.color === 'w' ? value : -value;
        }
      }
    }

    // Position evaluation (center control)
    const centerSquares: Square[] = ['d4', 'd5', 'e4', 'e5'];
    for (const square of centerSquares) {
      const piece = chess.get(square);
      if (piece) {
        const value = this.PIECE_VALUES[piece.type] * 0.1;
        score += piece.color === 'w' ? value : -value;
      }
    }

    // Piece development (knights and bishops on starting squares are less valuable)
    const startingSquares = {
      n: ['b1', 'g1', 'b8', 'g8'],
      b: ['c1', 'f1', 'c8', 'f8'],
    };

    for (const [pieceType, squares] of Object.entries(startingSquares)) {
      for (const square of squares) {
        const piece = chess.get(square as Square);
        if (piece && piece.type === pieceType) {
          const penalty = 0.5;
          score += piece.color === 'w' ? -penalty : penalty;
        }
      }
    }

    return score;
  }
}
