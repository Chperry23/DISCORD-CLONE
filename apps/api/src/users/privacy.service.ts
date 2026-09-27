import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import type {
  DeleteAccountDto,
  UserDataExportJobResponse,
  UserDataExportPayload,
} from "@discord-clone/shared";

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  async requestExport(userId: string): Promise<UserDataExportJobResponse> {
    const job = await this.prisma.userDataExportJob.create({
      data: { userId, status: "PENDING" },
    });

    try {
      const payload = await this.buildExportPayload(userId);
      const downloadToken = crypto.randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const updated = await this.prisma.userDataExportJob.update({
        where: { id: job.id },
        data: {
          status: "READY",
          payload: JSON.stringify(payload),
          downloadToken,
          expiresAt,
          completedAt: new Date(),
        },
      });

      return this.toJobResponse(updated);
    } catch {
      await this.prisma.userDataExportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
      throw new BadRequestException("Export failed");
    }
  }

  async getExportByToken(userId: string, token: string): Promise<UserDataExportPayload> {
    const job = await this.prisma.userDataExportJob.findFirst({
      where: { userId, downloadToken: token, status: "READY" },
    });
    if (!job || !job.payload) throw new NotFoundException("Export not found");
    if (job.expiresAt && job.expiresAt < new Date()) {
      throw new ForbiddenException("Export link expired");
    }

    return JSON.parse(job.payload) as UserDataExportPayload;
  }

  async listExports(userId: string): Promise<UserDataExportJobResponse[]> {
    const jobs = await this.prisma.userDataExportJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return jobs.map((j) => this.toJobResponse(j));
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) throw new ForbiddenException("Invalid password");

    const ownedCount = await this.prisma.server.count({ where: { ownerId: userId } });
    if (ownedCount > 0) {
      throw new BadRequestException(
        "Transfer or delete owned servers before deleting your account",
      );
    }

    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async buildExportPayload(userId: string): Promise<UserDataExportPayload> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const memberships = await this.prisma.member.findMany({
      where: { userId },
      include: { server: { select: { id: true, name: true } } },
    });

    const channelMessages = await this.prisma.message.findMany({
      where: { authorId: userId, deleted: false },
      include: { channel: { select: { serverId: true } } },
      orderBy: { createdAt: "asc" },
    });

    const directMessages = await this.prisma.directMessage.findMany({
      where: { authorId: userId, deleted: false },
      orderBy: { createdAt: "asc" },
    });

    const friendships = await this.prisma.friendship.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
    });

    const analyticsEventCount = await this.prisma.analyticsEvent.count({
      where: { userId },
    });

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      memberships: memberships.map((m) => ({
        serverId: m.serverId,
        serverName: m.server.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
      channelMessages: channelMessages.map((m) => ({
        id: m.id,
        channelId: m.channelId,
        serverId: m.channel.serverId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      directMessages: directMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      friendships: friendships.map((f) => ({
        id: f.id,
        status: f.status,
        otherUserId: f.userAId === userId ? f.userBId : f.userAId,
        createdAt: f.createdAt.toISOString(),
      })),
      analyticsEventCount,
    };
  }

  private toJobResponse(job: {
    id: string;
    status: string;
    createdAt: Date;
    completedAt: Date | null;
    expiresAt: Date | null;
    downloadToken: string | null;
  }): UserDataExportJobResponse {
    return {
      id: job.id,
      status: job.status as UserDataExportJobResponse["status"],
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      downloadToken: job.downloadToken,
    };
  }
}
