import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { createRedisClient } from '../config/redis.config';

@Injectable()
export class ChatService {
  private redis = createRedisClient();

  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
  ) {}

  async saveMessage(gameId: string, userId: string, message: string): Promise<ChatMessage> {
    const filteredMessage = this.filterProfanity(message);

    const chatMessage = this.chatMessageRepository.create({
      gameId,
      userId,
      message: filteredMessage,
    });

    const saved = await this.chatMessageRepository.save(chatMessage);

    await this.redis.lpush(`chat:${gameId}`, JSON.stringify(saved));
    await this.redis.ltrim(`chat:${gameId}`, 0, 49);
    await this.redis.expire(`chat:${gameId}`, 3600);

    return saved;
  }

  async getMessages(gameId: string): Promise<ChatMessage[]> {
    const cached = await this.redis.lrange(`chat:${gameId}`, 0, -1);
    if (cached && cached.length > 0) {
      return cached.map((msg) => JSON.parse(msg));
    }

    return this.chatMessageRepository.find({
      where: { gameId },
      order: { createdAt: 'ASC' },
      relations: ['user'],
      take: 50,
    });
  }

  private filterProfanity(message: string): string {
    const profanityWords = ['badword1', 'badword2'];
    let filtered = message;
    profanityWords.forEach((word) => {
      const regex = new RegExp(word, 'gi');
      filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
  }
}

