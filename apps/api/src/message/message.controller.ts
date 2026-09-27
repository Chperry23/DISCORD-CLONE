import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import { MessageService } from "./message.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { sendMessageSchema, editMessageSchema } from "@discord-clone/shared";
import type { SendMessageDto, EditMessageDto } from "@discord-clone/shared";

@Controller("channels/:channelId/messages")
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async send(
    @Param("channelId") channelId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: SendMessageDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.messageService.send(channelId, userId, dto.content);
  }

  @Get()
  async list(
    @Param("channelId") channelId: string,
    @CurrentUser("id") userId: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.messageService.list(
      channelId,
      userId,
      cursor,
      take ? parseInt(take, 10) : 50,
    );
  }

  @Patch(":messageId")
  async edit(
    @Param("messageId") messageId: string,
    @Body(new ZodValidationPipe(editMessageSchema)) dto: EditMessageDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.messageService.edit(messageId, userId, dto.content);
  }

  @Delete(":messageId")
  async remove(@Param("messageId") messageId: string, @CurrentUser("id") userId: string) {
    await this.messageService.delete(messageId, userId);
    return { message: "Message deleted" };
  }
}
