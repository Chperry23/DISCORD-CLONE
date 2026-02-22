import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ConflictException, UnauthorizedException, BadRequestException } from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { SessionService } from "./session.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  session: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((fns: unknown[]) => Promise.all(fns)),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("mock-token"),
};

const mockConfig = {
  get: jest.fn().mockReturnValue("15m"),
  getOrThrow: jest.fn().mockReturnValue("test-secret-32-chars-minimum-ok!"),
};

const mockSessions = {
  create: jest.fn(),
  findByToken: jest.fn(),
  rotate: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
};

const mockAnalytics = {
  track: jest.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SessionService, useValue: mockSessions },
        { provide: AnalyticsService, useValue: mockAnalytics },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe("register", () => {
    const dto = {
      username: "testuser",
      email: "test@example.com",
      password: "Password123",
    };

    it("should register a new user", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        displayName: "testuser",
        avatarUrl: null,
        createdAt: new Date(),
      });

      const result = await service.register(dto);

      expect(result.user.username).toBe("testuser");
      expect(result.tokens.accessToken).toBe("mock-token");
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        "user_registered",
        expect.objectContaining({ userId: "user-1" }),
      );
    });

    it("should throw ConflictException for duplicate email", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ email: "test@example.com" });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe("login", () => {
    const dto = { email: "test@example.com", password: "Password123" };

    it("should login with valid credentials", async () => {
      const hashed = await argon2.hash("Password123");
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        password: hashed,
        displayName: "testuser",
        avatarUrl: null,
        createdAt: new Date(),
      });

      const result = await service.login(dto);

      expect(result.user.email).toBe("test@example.com");
      expect(result.tokens.accessToken).toBeTruthy();
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        "user_logged_in",
        expect.objectContaining({ userId: "user-1" }),
      );
    });

    it("should throw UnauthorizedException for invalid password", async () => {
      const hashed = await argon2.hash("DifferentPassword1");
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        password: hashed,
      });

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        "login_failed",
        expect.objectContaining({
          userId: "user-1",
          payload: { reason: "invalid_password" },
        }),
      );
    });

    it("should throw UnauthorizedException for unknown email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        "login_failed",
        expect.objectContaining({ payload: { reason: "user_not_found" } }),
      );
    });
  });

  describe("refresh", () => {
    it("should return new tokens for valid session", async () => {
      mockSessions.findByToken.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.refresh("valid-refresh-token");

      expect(result.accessToken).toBe("mock-token");
      expect(mockSessions.rotate).toHaveBeenCalled();
    });

    it("should throw for expired session", async () => {
      mockSessions.findByToken.mockResolvedValue({
        id: "session-1",
        userId: "user-1",
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh("expired-token")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("requestPasswordReset", () => {
    it("should return success message even for unknown email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset("unknown@example.com");

      expect(result.message).toContain("If that email exists");
    });
  });

  describe("resetPassword", () => {
    it("should throw for invalid token", async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword("bad-token", "NewPassword1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
