import { Controller, Get, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get(':gameId/messages')
  async getMessages(@Param('gameId') gameId: string) {
    return this.chatService.getMessages(gameId);
  }
}

