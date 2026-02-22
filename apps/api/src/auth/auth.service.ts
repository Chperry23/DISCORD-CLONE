import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { SessionService } from "./session.service";
import type {
  RegisterDto,
  LoginDto,
  AuthTokens,
  AuthResponse,
  UserResponse,
} from "@discord-clone/shared";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
    private readonly analytics: AnalyticsService,
  ) {}

  async register(
    dto: RegisterDto,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existingUser) {
      throw new ConflictException(
        existingUser.email === dto.email ? "Email already registered" : "Username already taken",
      );
    }

    const hashedPassword = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        displayName: dto.displayName ?? dto.username,
      },
    });

    const tokens = await this.generateTokens(user.id);
    await this.sessions.create(user.id, tokens.refreshToken, {
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    this.analytics.track("user_registered", {
      userId: user.id,
      payload: { method: "email" },
    });

    return { user: this.toUserResponse(user), tokens };
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      this.analytics.track("login_failed", { payload: { reason: "user_not_found" } });
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await argon2.verify(user.password, dto.password);
    if (!valid) {
      this.analytics.track("login_failed", {
        userId: user.id,
        payload: { reason: "invalid_password" },
      });
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokens(user.id);
    await this.sessions.create(user.id, tokens.refreshToken, {
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    this.analytics.track("user_logged_in", {
      userId: user.id,
      payload: { method: "email" },
    });

    return { user: this.toUserResponse(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const session = await this.sessions.findByToken(refreshToken);
    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const tokens = await this.generateTokens(session.userId);

    await this.sessions.rotate(session.id, tokens.refreshToken);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessions.revoke(refreshToken);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessions.revokeAllForUser(userId);
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: "If that email exists, a reset link has been sent." };
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    // In production: send email with token
    this.logger.log(`Password reset token for ${email}: ${token}`);

    return { message: "If that email exists, a reset link has been sent." };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    const hashedPassword = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
    ]);

    return { message: "Password has been reset. Please log in again." };
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return this.toUserResponse(user);
  }

  async updateProfile(
    userId: string,
    data: { displayName?: string; avatarUrl?: string | null },
  ): Promise<UserResponse> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      },
    });
    return this.toUserResponse(user);
  }

  private async generateTokens(userId: string): Promise<AuthTokens> {
    const payload = { sub: userId };

    const accessToken = this.jwt.sign(payload);

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "7d"),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private toUserResponse(user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: Date;
  }): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
