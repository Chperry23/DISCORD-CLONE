import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { UserSearchResult } from "@discord-clone/shared";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(viewerId: string, query: string, limit = 10): Promise<UserSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const users = await this.prisma.user.findMany({
      where: {
        id: { not: viewerId },
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      take: limit,
      orderBy: { username: "asc" },
    });

    return users;
  }
}
