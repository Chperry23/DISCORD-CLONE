import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import type { MemberResponse } from "@discord-clone/shared";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async listMembers(serverId: string): Promise<MemberResponse[]> {
    const members = await this.prisma.member.findMany({
      where: { serverId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return members.map(this.toResponse);
  }

  async getMember(serverId: string, userId: string): Promise<MemberResponse> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!member) throw new NotFoundException("Member not found");
    return this.toResponse(member);
  }

  async join(serverId: string, userId: string): Promise<MemberResponse> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    const existing = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (existing) throw new ConflictException("Already a member of this server");

    const member = await this.prisma.member.create({
      data: { userId, serverId, role: "MEMBER" },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    this.analytics.track("member_joined", {
      userId,
      serverId,
      payload: { method: "direct" },
    });

    return this.toResponse(member);
  }

  async leave(serverId: string, userId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    if (server.ownerId === userId) {
      throw new ForbiddenException("Server owner cannot leave. Transfer ownership first.");
    }

    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member) throw new NotFoundException("Not a member of this server");

    await this.prisma.member.delete({
      where: { id: member.id },
    });

    this.analytics.track("member_left", { userId, serverId });
  }

  async updateNickname(
    serverId: string,
    userId: string,
    nickname: string | null,
  ): Promise<MemberResponse> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
    if (!member) throw new NotFoundException("Not a member of this server");

    const updated = await this.prisma.member.update({
      where: { id: member.id },
      data: { nickname },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    return this.toResponse(updated);
  }

  async kick(serverId: string, targetUserId: string, actorUserId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    const actor = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: actorUserId, serverId } },
    });
    if (!actor || !["OWNER", "ADMIN", "MODERATOR"].includes(actor.role)) {
      throw new ForbiddenException("Insufficient permissions to kick members");
    }

    const target = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });
    if (!target) throw new NotFoundException("Target user is not a member");

    const roleHierarchy: Record<string, number> = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3 };
    if ((roleHierarchy[actor.role] ?? 99) >= (roleHierarchy[target.role] ?? 99)) {
      throw new ForbiddenException("Cannot kick a member with equal or higher role");
    }

    await this.prisma.member.delete({ where: { id: target.id } });
  }

  private toResponse(
    member: {
      id: string;
      userId: string;
      serverId: string;
      nickname: string | null;
      role: string;
      joinedAt: Date;
      user: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
      };
    },
  ): MemberResponse {
    return {
      id: member.id,
      userId: member.userId,
      serverId: member.serverId,
      nickname: member.nickname,
      role: member.role as MemberResponse["role"],
      joinedAt: member.joinedAt.toISOString(),
      user: member.user,
    };
  }
}
