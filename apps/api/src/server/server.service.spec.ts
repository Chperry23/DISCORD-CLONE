import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ServerService } from "./server.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";
import { EntitlementService } from "../billing/entitlement.service";

const mockPrisma = {
  server: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  member: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((fns: unknown[]) => Promise.all(fns)),
};

const mockAnalytics = { track: jest.fn() };

const mockAuthz = {
  assertServerReadable: jest.fn(),
  assertMemberRole: jest.fn(),
};

const mockEntitlements = {
  hasActiveServerBoost: jest.fn().mockResolvedValue(false),
  boostedServerIds: jest.fn().mockResolvedValue(new Set()),
};

describe("ServerService", () => {
  let service: ServerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: AuthzService, useValue: mockAuthz },
        { provide: EntitlementService, useValue: mockEntitlements },
      ],
    }).compile();

    service = module.get<ServerService>(ServerService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a server and add owner as member", async () => {
      mockPrisma.server.findUnique.mockResolvedValue(null);
      mockPrisma.server.create.mockResolvedValue({
        id: "server-1",
        name: "Test Server",
        slug: "test-server-abc123",
        description: null,
        iconUrl: null,
        bannerUrl: null,
        ownerId: "user-1",
        visibility: "PRIVATE",
        createdAt: new Date(),
        _count: { members: 1 },
      });

      const result = await service.create(
        { name: "Test Server", visibility: "PRIVATE" },
        "user-1",
      );

      expect(result.name).toBe("Test Server");
      expect(result.ownerId).toBe("user-1");
      expect(result.memberCount).toBe(1);
      expect(mockAnalytics.track).toHaveBeenCalledWith(
        "server_created",
        expect.objectContaining({ userId: "user-1", serverId: "server-1" }),
      );
    });

    it("should throw ConflictException for duplicate slug", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.create({ name: "Test Server", visibility: "PRIVATE" }, "user-1"),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findById", () => {
    it("should return a server by id when readable", async () => {
      mockAuthz.assertServerReadable.mockResolvedValue({
        server: { id: "server-1", visibility: "PRIVATE" },
        member: { role: "MEMBER" },
      });
      mockPrisma.server.findUnique.mockResolvedValue({
        id: "server-1",
        name: "Test",
        slug: "test-xyz",
        description: null,
        iconUrl: null,
        bannerUrl: null,
        ownerId: "user-1",
        visibility: "PRIVATE",
        createdAt: new Date(),
        _count: { members: 5 },
      });

      const result = await service.findById("server-1", "user-1");
      expect(result.id).toBe("server-1");
      expect(result.memberCount).toBe(5);
    });

    it("should propagate authz denial for private servers", async () => {
      mockAuthz.assertServerReadable.mockRejectedValue(
        new ForbiddenException("This server is private"),
      );
      await expect(service.findById("server-1", "outsider")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("delete", () => {
    it("should delete server if caller is owner", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "user-1" });
      mockPrisma.server.delete.mockResolvedValue({});

      await service.delete("server-1", "user-1");
      expect(mockPrisma.server.delete).toHaveBeenCalledWith({ where: { id: "server-1" } });
    });

    it("should throw ForbiddenException if caller is not owner", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "user-1" });

      await expect(service.delete("server-1", "user-2")).rejects.toThrow(ForbiddenException);
    });
  });

  describe("transferOwnership", () => {
    it("should throw NotFoundException when new owner is not a member", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "user-1" });
      mockPrisma.member.findUnique.mockResolvedValue(null);

      await expect(
        service.transferOwnership("server-1", "user-1", "user-2"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException if non-owner tries to transfer", async () => {
      mockPrisma.server.findUnique.mockResolvedValue({ id: "server-1", ownerId: "user-1" });

      await expect(
        service.transferOwnership("server-1", "user-2", "user-3"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
