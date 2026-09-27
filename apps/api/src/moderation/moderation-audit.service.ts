import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { ModerationAction, ModerationAuditEventResponse } from "@discord-clone/shared";

/** Append-only writer for moderation audit events (no updates/deletes exposed). */
@Injectable()
export class ModerationAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    serverId: string;
    actorUserId: string;
    action: ModerationAction;
    targetUserId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const metadata = params.metadata ?? {};
    const sanitized = this.stripForbiddenFields(metadata);

    await this.prisma.moderationAuditEvent.create({
      data: {
        serverId: params.serverId,
        actorUserId: params.actorUserId,
        action: params.action,
        targetUserId: params.targetUserId ?? null,
        metadata: JSON.stringify(sanitized),
      },
    });
  }

  async listForServer(
    serverId: string,
    limit: number,
    cursor?: string,
  ): Promise<ModerationAuditEventResponse[]> {
    const rows = await this.prisma.moderationAuditEvent.findMany({
      where: { serverId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    return rows.map((row) => ({
      id: row.id,
      serverId: row.serverId,
      actorUserId: row.actorUserId,
      action: row.action as ModerationAction,
      targetUserId: row.targetUserId,
      metadata: this.parseMetadata(row.metadata),
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private stripForbiddenFields(metadata: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (key === "messageContent" || key === "messageBody") continue;
      if (typeof value === "string" && value.length > 512) {
        out[key] = value.slice(0, 512);
        continue;
      }
      out[key] = value;
    }
    return out;
  }

  private parseMetadata(raw: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
}
