import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuthzService } from "./authz.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  server: { findUnique: jest.fn() },
  member: { findUnique: jest.fn() },
  channel: { findUnique: jest.fn() },
};

describe("AuthzService", () => {
  let service: AuthzService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthzService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<AuthzService>(AuthzService);
    jest.clearAllMocks();
  });

  describe("assertServerReadable", () => {
    it("allows members on private servers", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({
        id: "s1",
        visibility: "PRIVATE",
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: "MEMBER" });

      const result = await service.assertServerReadable("s1", "u1");
      expect(result.member?.role).toBe("MEMBER");
    });

    it("allows non-members on public servers", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({
        id: "s1",
        visibility: "PUBLIC",
      });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      const result = await service.assertServerReadable("s1", "u1");
      expect(result.member).toBeNull();
    });

    it("denies non-members on private servers", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({
        id: "s1",
        visibility: "PRIVATE",
      });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(service.assertServerReadable("s1", "u1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("assertChannelReadable", () => {
    it("denies when user is not a member", async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({
        id: "c1",
        serverId: "s1",
        type: "TEXT",
      });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(service.assertChannelReadable("c1", "u1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("throws when channel missing", async () => {
      mockPrisma.channel.findUnique.mockResolvedValue(null);
      await expect(service.assertChannelReadable("c1", "u1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("assertVoiceJoin", () => {
    it("requires voice channel type", async () => {
      mockPrisma.channel.findUnique.mockResolvedValue({
        id: "c1",
        serverId: "s1",
        type: "TEXT",
      });
      mockPrisma.member.findUnique.mockResolvedValue({ role: "MEMBER" });

      await expect(service.assertVoiceJoin("c1", "u1")).rejects.toThrow(ForbiddenException);
    });
  });
});
