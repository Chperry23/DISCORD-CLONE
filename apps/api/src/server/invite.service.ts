import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import type { CreateInviteDto, InviteResponse, MemberResponse } from "@discord-clone/shared";
import { BanService } from "../moderation/ban.service";

@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly bans: BanService,
  ) {}

  async create(
    serverId: string,
    dto: CreateInviteDto,
    userId: string,
  ): Promise<InviteResponse> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member) throw new ForbiddenException("You must be a member to create invites");

    const code = this.generateCode();
    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    const invite = await this.prisma.invite.create({
      data: {
        code,
        serverId,
        creatorId: userId,
        maxUses: dto.maxUses ?? null,
        expiresAt,
      },
      include: {
        server: {
          include: { _count: { select: { members: true } } },
        },
      },
    });

    this.analytics.track("invite_created", {
      userId,
      serverId,
      payload: { code, maxUses: dto.maxUses, expiresInHours: dto.expiresInHours },
    });

    return this.toResponse(invite, invite.server._count.members);
  }

  async getByCode(code: string): Promise<InviteResponse> {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
      include: {
        server: {
          include: { _count: { select: { members: true } } },
        },
      },
    });

    if (!invite) throw new NotFoundException("Invite not found");
    return this.toResponse(invite, invite.server._count.members);
  }

  async useInvite(code: string, userId: string): Promise<MemberResponse> {
    const invite = await this.prisma.invite.findUnique({
      where: { code },
      include: { server: true },
    });

    if (!invite) throw new NotFoundException("Invite not found or expired");
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException("Invite has expired");
    }
    if (invite.maxUses && invite.uses >= invite.maxUses) {
      throw new BadRequestException("Invite has reached maximum uses");
    }

    const existing = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId: invite.serverId } },
    });
    if (existing) throw new BadRequestException("You are already a member of this server");

    await this.bans.assertNotBanned(invite.serverId, userId);

    const [member] = await this.prisma.$transaction([
      this.prisma.member.create({
        data: {
          userId,
          serverId: invite.serverId,
          role: "MEMBER",
        },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.invite.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
    ]);

    this.analytics.track("invite_used", {
      userId,
      serverId: invite.serverId,
      payload: { code },
    });

    this.analytics.track("member_joined", {
      userId,
      serverId: invite.serverId,
      payload: { method: "invite", inviteCode: code },
    });

    return {
      id: member.id,
      userId: member.userId,
      serverId: member.serverId,
      nickname: member.nickname,
      role: member.role as "MEMBER",
      joinedAt: member.joinedAt.toISOString(),
      user: member.user,
    };
  }

  async listForServer(serverId: string, userId: string): Promise<InviteResponse[]> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    const invites = await this.prisma.invite.findMany({
      where: { serverId },
      include: {
        server: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invites.map((i) => this.toResponse(i, i.server._count.members));
  }

  async revoke(inviteId: string, serverId: string, userId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    await this.prisma.invite.delete({ where: { id: inviteId } });
  }

  private generateCode(): string {
    return crypto.randomBytes(6).toString("base64url").slice(0, 8);
  }

  private toResponse(
    invite: {
      id: string;
      code: string;
      serverId: string;
      maxUses: number | null;
      uses: number;
      expiresAt: Date | null;
      createdAt: Date;
      server: {
        id: string;
        name: string;
        iconUrl: string | null;
      };
    },
    memberCount: number,
  ): InviteResponse {
    return {
      id: invite.id,
      code: invite.code,
      serverId: invite.serverId,
      maxUses: invite.maxUses,
      uses: invite.uses,
      expiresAt: invite.expiresAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
      server: {
        id: invite.server.id,
        name: invite.server.name,
        iconUrl: invite.server.iconUrl,
        memberCount,
      },
    };
  }
}
