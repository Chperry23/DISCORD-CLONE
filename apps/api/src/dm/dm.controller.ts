import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DmService } from "./dm.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("dm")
@UseGuards(JwtAuthGuard)
export class DmController {
  constructor(private readonly dm: DmService) {}

  @Get("conversations")
  async getConversations(@CurrentUser("id") userId: string) {
    return this.dm.getConversations(userId);
  }

  @Post("conversations")
  async createConversation(
    @CurrentUser("id") userId: string,
    @Body() body: { targetUserId: string },
  ) {
    return this.dm.getOrCreateConversation(userId, body.targetUserId);
  }

  @Get("conversations/:conversationId/messages")
  async getMessages(
    @CurrentUser("id") userId: string,
    @Param("conversationId") conversationId: string,
    @Query("cursor") cursor?: string,
  ) {
    return this.dm.getMessages(conversationId, userId, cursor);
  }

  @Post("conversations/:conversationId/messages")
  async sendMessage(
    @CurrentUser("id") userId: string,
    @Param("conversationId") conversationId: string,
    @Body() body: { content: string },
  ) {
    return this.dm.sendMessage(conversationId, userId, body.content);
  }
}
