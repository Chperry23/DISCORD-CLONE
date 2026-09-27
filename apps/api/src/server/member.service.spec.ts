import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { MemberService } from "./member.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";

const mockUser = {
  id: "user-1",
  username: "testuser",
  displayName: "Test",
  avatarUrl: null,
};

const mockPrisma = {
  server: { findUnique: jest.fn() },
  member: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockAnalytics = { track: jest.fn() };
const mockAuthz = { assertCanKick: jest.fn() };

describe("MemberService", () => {
  let service: MemberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: AuthzService, useValue: mockAuthz },
      ],
    }).compile();

    service = module.get<MemberService>(MemberService);
    jest.clearAllMocks();
  });

  describe("join", () => {
    it("should add user as member", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1" });
      mockPrisma.member.findUnique.mockResolvedValue(null);
      mockPrisma.member.create.mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        serverId: "server-1",
        nickname: null,
        role: "MEMBER",
        joinedAt: new Date(),
        user: mockUser,
      });

      const result = await service.join("server-1", "user-1");
      expect(result.role).toBe("MEMBER");
      expect(mockAnalytics.track).toHaveBeenCalledWith("member_joined", expect.anything());
    });

    it("should throw ConflictException if already a member", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1" });
      mockPrisma.member.findUnique.mockResolvedValue({ id: "existing" });

      await expect(service.join("server-1", "user-1")).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException for missing server", async () => {
      mockPrisma.server.findUnique.mockResolvedValue(null);

      await expect(service.join("nonexistent", "user-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("leave", () => {
    it("should not allow owner to leave", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "user-1" });

      await expect(service.leave("server-1", "user-1")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("kick", () => {
    it("should throw ForbiddenException when kicking higher role", async () => {
      mockAuthz.assertCanKick.mockRejectedValue(
        new ForbiddenException("Cannot kick a member with equal or higher role"),
      );

      await expect(
        service.kick("server-1", "target-user", "actor-user"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
