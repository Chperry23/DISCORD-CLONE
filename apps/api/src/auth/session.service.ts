import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(
    userId: string,
    refreshToken: string,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    const expiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d");
    const ms = this.parseDuration(expiresIn);
    const expiresAt = new Date(Date.now() + ms);

    return this.prisma.session.create({
      data: {
        userId,
        refreshToken,
        userAgent: meta.userAgent,
        ipAddress: meta.ip,
        expiresAt,
      },
    });
  }

  async findByToken(refreshToken: string) {
    return this.prisma.session.findUnique({ where: { refreshToken } });
  }

  async rotate(sessionId: string, newRefreshToken: string) {
    const expiresIn = this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d");
    const ms = this.parseDuration(expiresIn);

    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + ms),
      },
    });
  }

  async revoke(refreshToken: string) {
    return this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  async revokeAllForUser(userId: string) {
    return this.prisma.session.deleteMany({ where: { userId } });
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d

    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] ?? 24 * 60 * 60 * 1000);
  }
}
