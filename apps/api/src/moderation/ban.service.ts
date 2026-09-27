import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { canBanMember, canModerate } from "@nexus/authz";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { ModerationAuditService } from "./moderation-audit.service";
import type { BanMemberDto, ServerBanResponse } from "@discord-clone/shared";

@Injectable()
export class BanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: ModerationAuditService,
  ) {}

  async assertNotBanned(serverId: string, userId: string): Promise<void> {
    const ban = await this.prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    if (!ban) return;

    if (ban.expiresAt && ban.expiresAt <= new Date()) {
      await this.prisma.serverBan.delete({ where: { id: ban.id } });
      return;
    }

    throw new ForbiddenException("You are banned from this server");
  }

  async listBans(serverId: string, actorUserId: string): Promise<ServerBanResponse[]> {
    await this.authz.assertMemberRole(serverId, actorUserId, ["OWNER", "ADMIN", "MODERATOR"]);

    const bans = await this.prisma.serverBan.findMany({
      where: { serverId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return bans.map((ban) => this.toResponse(ban));
  }

  async ban(
    serverId: string,
    targetUserId: string,
    actorUserId: string,
    dto: BanMemberDto,
  ): Promise<ServerBanResponse> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");
    if (targetUserId === server.ownerId) {
      throw new ForbiddenException("Cannot ban the server owner");
    }
    if (targetUserId === actorUserId) {
      throw new BadRequestException("Cannot ban yourself");
    }

    const actor = await this.authz.getMembership(serverId, actorUserId);
    if (!actor || !canModerate(actor.role)) {
      throw new ForbiddenException("Insufficient permissions to ban members");
    }

    const target = await this.authz.getMembership(serverId, targetUserId);
    if (target && !canBanMember(actor.role, target.role)) {
      throw new ForbiddenException("Cannot ban a member with equal or higher role");
    }

    const existing = await this.prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    });
    if (existing) throw new ConflictException("User is already banned");

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    const ban = await this.prisma.$transaction(async (tx) => {
      if (target) {
        await tx.member.delete({ where: { id: target.id } });
      }

      return tx.serverBan.create({
        data: {
          serverId,
          userId: targetUserId,
          bannedById: actorUserId,
          reason: dto.reason?.trim() || null,
          expiresAt,
        },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });
    });

    await this.audit.record({
      serverId,
      actorUserId,
      action: "BAN",
      targetUserId,
      metadata: {
        reasonPresent: Boolean(dto.reason?.trim()),
        expiresAt: expiresAt?.toISOString() ?? null,
      },
    });

    return this.toResponse(ban);
  }

  async unban(serverId: string, targetUserId: string, actorUserId: string): Promise<void> {
    await this.authz.assertMemberRole(serverId, actorUserId, ["OWNER", "ADMIN", "MODERATOR"]);

    const ban = await this.prisma.serverBan.findUnique({
      where: { serverId_userId: { serverId, userId: targetUserId } },
    });
    if (!ban) throw new NotFoundException("Ban not found");

    await this.prisma.serverBan.delete({ where: { id: ban.id } });

    await this.audit.record({
      serverId,
      actorUserId,
      action: "UNBAN",
      targetUserId,
    });
  }

  private toResponse(ban: {
    id: string;
    serverId: string;
    userId: string;
    bannedById: string;
    reason: string | null;
    expiresAt: Date | null;
    createdAt: Date;
    user: {
      id: string;
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
  }): ServerBanResponse {
    return {
      id: ban.id,
      serverId: ban.serverId,
      userId: ban.userId,
      bannedById: ban.bannedById,
      reason: ban.reason,
      expiresAt: ban.expiresAt?.toISOString() ?? null,
      createdAt: ban.createdAt.toISOString(),
      user: ban.user,
    };
  }
}
