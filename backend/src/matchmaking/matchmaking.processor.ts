import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchmakingService } from './matchmaking.service';

@Injectable()
export class MatchmakingProcessor {
  private readonly logger = new Logger(MatchmakingProcessor.name);

  constructor(private matchmakingService: MatchmakingService) {}

  @Cron('*/2 * * * * *') // Every 2 seconds
  async processMatchmaking() {
    try {
      await this.matchmakingService.processMatchmakingQueue();
    } catch (error) {
      this.logger.error(`Error processing matchmaking queue: ${error.message}`);
    }
  }
}

