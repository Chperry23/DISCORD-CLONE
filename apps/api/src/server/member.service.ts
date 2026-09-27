import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";
import { PresenceService } from "../presence/presence.service";
import type { MemberResponse } from "@discord-clone/shared";
import { canAssignMemberRole } from "@nexus/authz";
import type { MemberRole } from "@nexus/authz";
import { BanService } from "../moderation/ban.service";
import { ModerationAuditService } from "../moderation/moderation-audit.service";
import { EntitlementService } from "../billing/entitlement.service";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly authz: AuthzService,
    private readonly presence: PresenceService,
    private readonly bans: BanService,
    private readonly audit: ModerationAuditService,
    private readonly entitlements: EntitlementService,
  ) {}

  async getPresenceMapForMember(serverId: string, viewerId: string): Promise<Record<string, "online" | "offline">> {
    await this.authz.assertMembership(serverId, viewerId);
    const members = await this.prisma.member.findMany({
      where: { serverId },
      select: { userId: true },
    });
    return this.presence.getStatuses(members.map((m) => m.userId));
  }

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

    return this.mapMembers(members);
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
    const [mapped] = await this.mapMembers([member]);
    return mapped!;
  }

  async join(serverId: string, userId: string): Promise<MemberResponse> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    await this.bans.assertNotBanned(serverId, userId);

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

    return (await this.mapMembers([member]))[0]!;
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

    return (await this.mapMembers([updated]))[0]!;
  }

  async kick(serverId: string, targetUserId: string, actorUserId: string): Promise<void> {
    const { target } = await this.authz.assertCanKick(serverId, actorUserId, targetUserId);
    await this.prisma.member.delete({ where: { id: target.id } });
    await this.audit.record({
      serverId,
      actorUserId,
      action: "KICK",
      targetUserId,
    });
  }

  async updateRole(
    serverId: string,
    targetUserId: string,
    actorUserId: string,
    role: MemberRole,
  ): Promise<MemberResponse> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    const actor = await this.authz.assertMemberRole(serverId, actorUserId, ["OWNER", "ADMIN"]);
    const target = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: targetUserId, serverId } },
    });
    if (!target) throw new NotFoundException("Member not found");

    if (!canAssignMemberRole(actor.role, target.role, role)) {
      throw new ForbiddenException("Cannot assign this role");
    }

    const updated = await this.prisma.member.update({
      where: { id: target.id },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    await this.audit.record({
      serverId,
      actorUserId,
      action: "ROLE_CHANGE",
      targetUserId,
      metadata: { previousRole: target.role, newRole: role },
    });

    return (await this.mapMembers([updated]))[0]!;
  }

  private async mapMembers(
    members: Array<{
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
    }>,
  ): Promise<MemberResponse[]> {
    const badgeUsers = await this.entitlements.profileBadgeUserIds(
      members.map((m) => m.userId),
    );
    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      serverId: member.serverId,
      nickname: member.nickname,
      role: member.role as MemberResponse["role"],
      joinedAt: member.joinedAt.toISOString(),
      user: {
        ...member.user,
        profileBadge: badgeUsers.has(member.userId),
      },
    }));
  }
}
