import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, ConflictException } from "@nestjs/common";
import { BanService } from "./ban.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { ModerationAuditService } from "./moderation-audit.service";

const mockPrisma = {
  server: { findUnique: jest.fn() },
  serverBan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  member: { delete: jest.fn() },
  $transaction: jest.fn(),
};

const mockAuthz = {
  assertMemberRole: jest.fn(),
  getMembership: jest.fn(),
};

const mockAudit = { record: jest.fn() };

describe("BanService", () => {
  let service: BanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BanService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthzService, useValue: mockAuthz },
        { provide: ModerationAuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get(BanService);
    jest.clearAllMocks();
  });

  describe("assertNotBanned", () => {
    it("throws when an active ban exists", async () => {
      mockPrisma.serverBan.findUnique.mockResolvedValue({
        id: "ban-1",
        expiresAt: null,
      });

      await expect(service.assertNotBanned("server-1", "user-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("clears expired bans", async () => {
      mockPrisma.serverBan.findUnique.mockResolvedValue({
        id: "ban-1",
        expiresAt: new Date(Date.now() - 1000),
      });
      mockPrisma.serverBan.delete.mockResolvedValue({});

      await expect(service.assertNotBanned("server-1", "user-1")).resolves.toBeUndefined();
      expect(mockPrisma.serverBan.delete).toHaveBeenCalled();
    });
  });

  describe("ban", () => {
    it("rejects duplicate bans", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "owner" });
      mockAuthz.getMembership
        .mockResolvedValueOnce({ role: "ADMIN" })
        .mockResolvedValueOnce({ role: "MEMBER", id: "m1" });
      mockPrisma.serverBan.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.ban("server-1", "target", "admin", {}),
      ).rejects.toThrow(ConflictException);
    });
  });
});
