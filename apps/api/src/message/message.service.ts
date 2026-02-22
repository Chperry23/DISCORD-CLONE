import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import type { MessageResponse, MessagePage } from "@discord-clone/shared";

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async send(channelId: string, authorId: string, content: string): Promise<MessageResponse> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, serverId: true },
    });
    if (!channel) throw new NotFoundException("Channel not found");

    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: authorId, serverId: channel.serverId } },
    });
    if (!member) throw new ForbiddenException("You must be a member to send messages");

    const message = await this.prisma.message.create({
      data: { channelId, authorId, content },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.analytics.track("message_sent", {
      userId: authorId,
      serverId: channel.serverId,
      payload: { channelId, messageId: message.id },
    });

    return this.toResponse(message);
  }

  async list(channelId: string, cursor?: string, take = 50): Promise<MessagePage> {
    const messages = await this.prisma.message.findMany({
      where: { channelId, deleted: false },
      include: {
        author: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > take;
    const results = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? results[results.length - 1]!.id : null;

    return {
      messages: results.reverse().map(this.toResponse),
      nextCursor,
    };
  }

  async edit(messageId: string, userId: string, content: string): Promise<MessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.authorId !== userId) throw new ForbiddenException("You can only edit your own messages");

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return this.toResponse(updated);
  }

  async delete(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException("Message not found");
    if (message.authorId !== userId) throw new ForbiddenException("You can only delete your own messages");

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deleted: true, content: "[message deleted]" },
    });
  }

  private toResponse(msg: {
    id: string;
    channelId: string;
    content: string;
    editedAt: Date | null;
    deleted: boolean;
    createdAt: Date;
    author: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  }): MessageResponse {
    return {
      id: msg.id,
      channelId: msg.channelId,
      content: msg.content,
      author: msg.author,
      editedAt: msg.editedAt?.toISOString() ?? null,
      deleted: msg.deleted,
      createdAt: msg.createdAt.toISOString(),
    };
  }
}
