import { Controller, Get, Post, Delete, Param, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { addReactionSchema, createThreadSchema } from "@discord-clone/shared";
import type { AddReactionDto, CreateThreadDto } from "@discord-clone/shared";
import { ReactionService } from "./reaction.service";
import { PinService } from "./pin.service";
import { ThreadService } from "./thread.service";

@Controller("channels/:channelId/messages/:messageId")
@UseGuards(JwtAuthGuard)
export class MessageFeaturesController {
  constructor(
    private readonly reactions: ReactionService,
    private readonly pins: PinService,
    private readonly threads: ThreadService,
  ) {}

  @Post("reactions")
  addReaction(
    @Param("messageId") messageId: string,
    @Body(new ZodValidationPipe(addReactionSchema)) dto: AddReactionDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.reactions.toggle(messageId, userId, dto.emoji);
  }

  @Post("pin")
  pin(
    @Param("channelId") channelId: string,
    @Param("messageId") messageId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.pins.pin(channelId, messageId, userId);
  }

  @Delete("pin")
  unpin(
    @Param("channelId") channelId: string,
    @Param("messageId") messageId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.pins.unpin(channelId, messageId, userId);
  }

  @Get("thread")
  getThread(
    @Param("channelId") channelId: string,
    @Param("messageId") messageId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.threads.getThreadForMessage(channelId, messageId, userId);
  }

  @Post("thread")
  createThread(
    @Param("channelId") channelId: string,
    @Param("messageId") messageId: string,
    @Body(new ZodValidationPipe(createThreadSchema)) dto: CreateThreadDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.threads.createThread(channelId, messageId, userId, dto);
  }
}

@Controller("channels/:channelId/pins")
@UseGuards(JwtAuthGuard)
export class PinListController {
  constructor(private readonly pins: PinService) {}

  @Get()
  list(@Param("channelId") channelId: string, @CurrentUser("id") userId: string) {
    return this.pins.listPins(channelId, userId);
  }
}
