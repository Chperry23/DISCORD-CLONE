import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { InAppNotificationResponse } from "@discord-clone/shared";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  async createMentionNotifications(params: {
    mentionedUserIds: string[];
    actorId: string;
    serverId: string;
    channelId: string;
    messageId: string;
    actorUsername: string;
  }) {
    const targets = params.mentionedUserIds.filter((id) => id !== params.actorId);
    if (targets.length === 0) return;

    const summary = `${params.actorUsername} mentioned you in a message`;

    for (const userId of targets) {
      const row = await this.prisma.inAppNotification.create({
        data: {
          userId,
          type: "MENTION",
          serverId: params.serverId,
          channelId: params.channelId,
          messageId: params.messageId,
          actorId: params.actorId,
          summary,
        },
      });
      this.realtime.emitUserNotification(userId, this.toResponse(row));
    }
  }

  async listForUser(userId: string, take = 30): Promise<InAppNotificationResponse[]> {
    const rows = await this.prisma.inAppNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
    return rows.map(this.toResponse);
  }

  async markRead(notificationId: string, userId: string): Promise<InAppNotificationResponse> {
    const existing = await this.prisma.inAppNotification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) throw new NotFoundException("Notification not found");

    const row = await this.prisma.inAppNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return this.toResponse(row);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private toResponse(row: {
    id: string;
    type: string;
    serverId: string | null;
    channelId: string | null;
    messageId: string | null;
    actorId: string | null;
    summary: string;
    readAt: Date | null;
    createdAt: Date;
  }): InAppNotificationResponse {
    return {
      id: row.id,
      type: row.type as InAppNotificationResponse["type"],
      serverId: row.serverId,
      channelId: row.channelId,
      messageId: row.messageId,
      actorId: row.actorId,
      summary: row.summary,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
