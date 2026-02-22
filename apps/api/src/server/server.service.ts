import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import type { CreateServerDto, UpdateServerDto, ServerResponse } from "@discord-clone/shared";

@Injectable()
export class ServerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(dto: CreateServerDto, userId: string): Promise<ServerResponse> {
    const slug = this.generateSlug(dto.name);

    const existing = await this.prisma.server.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException("A server with a similar name already exists");
    }

    const server = await this.prisma.server.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        visibility: dto.visibility,
        ownerId: userId,
        members: {
          create: { userId, role: "OWNER" },
        },
        channels: {
          create: { name: "general", type: "TEXT", position: 0 },
        },
      },
      include: { _count: { select: { members: true } } },
    });

    this.analytics.track("server_created", {
      userId,
      serverId: server.id,
      payload: { name: server.name, visibility: server.visibility },
    });

    return this.toResponse(server, server._count.members);
  }

  async findById(serverId: string): Promise<ServerResponse> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      include: { _count: { select: { members: true } } },
    });

    if (!server) throw new NotFoundException("Server not found");
    return this.toResponse(server, server._count.members);
  }

  async findBySlug(slug: string): Promise<ServerResponse> {
    const server = await this.prisma.server.findUnique({
      where: { slug },
      include: { _count: { select: { members: true } } },
    });

    if (!server) throw new NotFoundException("Server not found");
    return this.toResponse(server, server._count.members);
  }

  async listForUser(userId: string): Promise<ServerResponse[]> {
    const memberships = await this.prisma.member.findMany({
      where: { userId },
      include: {
        server: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return memberships.map((m) => this.toResponse(m.server, m.server._count.members));
  }

  async listPublic(
    cursor?: string,
    take = 20,
  ): Promise<{ servers: ServerResponse[]; nextCursor: string | null }> {
    const servers = await this.prisma.server.findMany({
      where: { visibility: "PUBLIC" },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = servers.length > take;
    const results = hasMore ? servers.slice(0, take) : servers;
    const nextCursor = hasMore ? results[results.length - 1]!.id : null;

    return {
      servers: results.map((s) => this.toResponse(s, s._count.members)),
      nextCursor,
    };
  }

  async update(serverId: string, dto: UpdateServerDto, userId: string): Promise<ServerResponse> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");

    await this.assertAdminOrOwner(serverId, userId);

    const updated = await this.prisma.server.update({
      where: { id: serverId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
      },
      include: { _count: { select: { members: true } } },
    });

    return this.toResponse(updated, updated._count.members);
  }

  async delete(serverId: string, userId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");
    if (server.ownerId !== userId) {
      throw new ForbiddenException("Only the server owner can delete it");
    }

    await this.prisma.server.delete({ where: { id: serverId } });
  }

  async transferOwnership(serverId: string, currentOwnerId: string, newOwnerId: string) {
    const server = await this.prisma.server.findUnique({ where: { id: serverId } });
    if (!server) throw new NotFoundException("Server not found");
    if (server.ownerId !== currentOwnerId) {
      throw new ForbiddenException("Only the server owner can transfer ownership");
    }

    const newOwnerMember = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId: newOwnerId, serverId } },
    });
    if (!newOwnerMember) {
      throw new NotFoundException("New owner must be a member of the server");
    }

    await this.prisma.$transaction([
      this.prisma.server.update({
        where: { id: serverId },
        data: { ownerId: newOwnerId },
      }),
      this.prisma.member.update({
        where: { id: newOwnerMember.id },
        data: { role: "OWNER" },
      }),
      this.prisma.member.updateMany({
        where: { serverId, userId: currentOwnerId },
        data: { role: "ADMIN" },
      }),
    ]);

    this.analytics.track("ownership_transferred", {
      userId: currentOwnerId,
      serverId,
      payload: { newOwnerId },
    });
  }

  async assertAdminOrOwner(serverId: string, userId: string): Promise<void> {
    const member = await this.prisma.member.findUnique({
      where: { userId_serverId: { userId, serverId } },
    });

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }

  private toResponse(
    server: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      iconUrl: string | null;
      bannerUrl: string | null;
      ownerId: string;
      visibility: string;
      createdAt: Date;
    },
    memberCount: number,
  ): ServerResponse {
    return {
      id: server.id,
      name: server.name,
      slug: server.slug,
      description: server.description,
      iconUrl: server.iconUrl,
      bannerUrl: server.bannerUrl,
      ownerId: server.ownerId,
      visibility: server.visibility as "PUBLIC" | "PRIVATE",
      memberCount,
      createdAt: server.createdAt.toISOString(),
    };
  }
}
