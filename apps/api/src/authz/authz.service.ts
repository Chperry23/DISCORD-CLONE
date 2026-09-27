import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { canKickMember, canModerate, hasAnyRole } from "@nexus/authz";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthzService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(serverId: string, userId: string) {
    return this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });
  }

  async assertMembership(serverId: string, userId: string) {
    const member = await this.getMembership(serverId, userId);
    if (!member) {
      throw new ForbiddenException("You must be a member of this server");
    }
    return member;
  }

  async assertMemberRole(serverId: string, userId: string, roles: readonly string[]) {
    const member = await this.assertMembership(serverId, userId);
    if (!hasAnyRole(member.role, roles)) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return member;
  }

  /** Member-only, or public server metadata for discovery preview. */
  async assertServerReadable(serverId: string, userId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    const member = await this.getMembership(serverId, userId);
    if (member) return { server, member };

    if (server.visibility === "PUBLIC") {
      return { server, member: null };
    }

    throw new ForbiddenException("This server is private");
  }

  async assertChannelReadable(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException("Channel not found");

    await this.assertMembership(channel.serverId, userId);
    return channel;
  }

  async assertChannelSocketJoin(channelId: string, userId: string) {
    return this.assertChannelReadable(channelId, userId);
  }

  async assertVoiceJoin(channelId: string, userId: string) {
    const channel = await this.assertChannelReadable(channelId, userId);
    if (channel.type !== "VOICE") {
      throw new ForbiddenException("Not a voice channel");
    }
    return channel;
  }

  async assertCanKick(serverId: string, actorUserId: string, targetUserId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    const actor = await this.getMembership(serverId, actorUserId);
    if (!actor || !canModerate(actor.role)) {
      throw new ForbiddenException("Insufficient permissions to kick members");
    }

    const target = await this.getMembership(serverId, targetUserId);
    if (!target) throw new NotFoundException("Target user is not a member");

    if (!canKickMember(actor.role, target.role)) {
      throw new ForbiddenException("Cannot kick a member with equal or higher role");
    }

    return { actor, target };
  }
}
