import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";
import { MetricsService } from "../common/metrics/metrics.service";
import { AttachmentService } from "./attachment.service";
import { NotificationService } from "../notification/notification.service";
import { RealtimeService } from "../realtime/realtime.service";
import { parseMentionUsernames } from "@discord-clone/shared";
import type { MessagePage, MessageResponse, SendMessageDto } from "@discord-clone/shared";
import { mapMessageToResponse, messageInclude } from "./message.mapper";

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly authz: AuthzService,
    private readonly metrics: MetricsService,
    private readonly attachments: AttachmentService,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  private apiBasePath(): string {
    const prefix = this.config.get<string>("API_GLOBAL_PREFIX") ?? "api";
    return `/${prefix}`;
  }

  async send(
    channelId: string,
    authorId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponse> {
    return this.metrics.trackOperation(
      "message_send",
      async () => {
        const channel = await this.authz.assertChannelReadable(channelId, authorId);
        const content = dto.content?.trim() ?? "";

        const message = await this.prisma.message.create({
          data: { channelId, authorId, content: content || " " },
          include: messageInclude,
        });

        if (dto.attachmentIds?.length) {
          await this.attachments.bindAttachmentsToMessage(
            message.id,
            channelId,
            authorId,
            dto.attachmentIds,
          );
        }

        const full = await this.prisma.message.findUniqueOrThrow({
          where: { id: message.id },
          include: messageInclude,
        });

        await this.processMentions(full, channel.serverId, authorId);

        this.analytics.track("message_sent", {
          userId: authorId,
          serverId: channel.serverId,
          payload: { channelId, messageId: message.id },
        });

        const response = mapMessageToResponse(full, authorId, this.apiBasePath());
        this.realtime.emitChannelEvent(channelId, "message:new", response);
        return response;
      },
      { userId: authorId },
    );
  }

  private async processMentions(
    message: {
      id: string;
      channelId: string;
      content: string;
      author: { id: string; username: string };
    },
    serverId: string,
    authorId: string,
  ) {
    const usernames = parseMentionUsernames(message.content);
    if (usernames.length === 0) return;

    const members = await this.prisma.member.findMany({
      where: { serverId },
      include: { user: { select: { id: true, username: true } } },
    });

    const byUsername = new Map(
      members.map((m) => [m.user.username.toLowerCase(), m.user.id]),
    );

    const mentionedUserIds = usernames
      .map((u) => byUsername.get(u))
      .filter((id): id is string => Boolean(id));

    await this.notifications.createMentionNotifications({
      mentionedUserIds,
      actorId: authorId,
      serverId,
      channelId: message.channelId,
      messageId: message.id,
      actorUsername: message.author.username,
    });
  }

  async list(channelId: string, userId: string, cursor?: string, take = 50): Promise<MessagePage> {
    await this.authz.assertChannelReadable(channelId, userId);
    const messages = await this.prisma.message.findMany({
      where: { channelId, deleted: false },
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = messages.length > take;
    const results = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? results[results.length - 1]!.id : null;

    return {
      messages: results
        .reverse()
        .map((m) => mapMessageToResponse(m, userId, this.apiBasePath())),
      nextCursor,
    };
  }

  async edit(messageId: string, userId: string, content: string): Promise<MessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { channel: true },
    });
    if (!message) throw new NotFoundException("Message not found");
    if (message.authorId !== userId) throw new ForbiddenException("You can only edit your own messages");

    await this.authz.assertChannelReadable(message.channelId, userId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: messageInclude,
    });

    return mapMessageToResponse(updated, userId, this.apiBasePath());
  }

  async delete(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException("Message not found");
    if (message.authorId !== userId) throw new ForbiddenException("You can only delete your own messages");

    await this.authz.assertChannelReadable(message.channelId, userId);

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deleted: true, content: "[message deleted]" },
    });
  }

  async getById(messageId: string, userId: string): Promise<MessageResponse> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude,
    });
    if (!message || message.deleted) throw new NotFoundException("Message not found");
    await this.authz.assertChannelReadable(message.channelId, userId);
    return mapMessageToResponse(message, userId, this.apiBasePath());
  }
}
