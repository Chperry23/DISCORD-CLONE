import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { ConfigService } from "@nestjs/config";
import { RealtimeService } from "../realtime/realtime.service";
import { mapMessageToResponse, messageInclude } from "./message.mapper";
import type { MessageResponse } from "@discord-clone/shared";

@Injectable()
export class ReactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  private apiBasePath(): string {
    const prefix = this.config.get<string>("API_GLOBAL_PREFIX") ?? "api";
    return `/${prefix}`;
  }

  private async loadMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!message || message.deleted) throw new NotFoundException("Message not found");
    return message;
  }

  async toggle(messageId: string, userId: string, emoji: string): Promise<MessageResponse> {
    const message = await this.loadMessage(messageId);
    await this.authz.assertChannelReadable(message.channelId, userId);

    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    const updated = await this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude,
    });

    const response = mapMessageToResponse(updated, userId, this.apiBasePath());
    this.realtime.emitChannelEvent(message.channelId, "message:update", response);
    return response;
  }
}
