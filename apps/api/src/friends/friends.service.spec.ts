import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { PrismaService } from "../prisma/prisma.service";

const userA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const mockPrisma = {
  user: { findUnique: jest.fn() },
  friendship: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
};

describe("FriendsService", () => {
  let service: FriendsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FriendsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(FriendsService);
    jest.clearAllMocks();
  });

  it("rejects self friend request", async () => {
    await expect(service.sendRequest(userA, userA)).rejects.toThrow(BadRequestException);
  });

  it("creates pending friendship", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: userB });
    mockPrisma.friendship.findUnique.mockResolvedValue(null);
    mockPrisma.friendship.create.mockResolvedValue({
      id: "f1",
      userAId: userA,
      userBId: userB,
      requestedById: userA,
      status: "PENDING",
      createdAt: new Date(),
      userA: { id: userA, username: "a", displayName: null, avatarUrl: null },
      userB: { id: userB, username: "b", displayName: null, avatarUrl: null },
    });

    const result = await service.sendRequest(userA, userB);
    expect(result.status).toBe("PENDING");
    expect(result.direction).toBe("outgoing");
  });

  it("blocks duplicate pending", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: userB });
    mockPrisma.friendship.findUnique.mockResolvedValue({ status: "PENDING" });

    await expect(service.sendRequest(userA, userB)).rejects.toThrow(ConflictException);
  });

  it("denies accept of own request", async () => {
    mockPrisma.friendship.findUnique.mockResolvedValue({
      id: "f1",
      userAId: userA,
      userBId: userB,
      requestedById: userA,
      status: "PENDING",
    });

    await expect(service.accept(userA, "f1")).rejects.toThrow(ForbiddenException);
  });
});
