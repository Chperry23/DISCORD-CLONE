import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ForbiddenException } from "@nestjs/common";
import { ReactionService } from "./reaction.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { RealtimeService } from "../realtime/realtime.service";

const mockPrisma = {
  message: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  messageReaction: {
    findUnique: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
  },
};

const mockAuthz = { assertChannelReadable: jest.fn() };
const mockRealtime = { emitChannelEvent: jest.fn() };
const mockConfig = { get: jest.fn(() => "api") };

describe("ReactionService", () => {
  let service: ReactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthzService, useValue: mockAuthz },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<ReactionService>(ReactionService);
    jest.clearAllMocks();
  });

  it("requires channel membership", async () => {
    mockPrisma.message.findUnique.mockResolvedValue({
      id: "m1",
      channelId: "c1",
      deleted: false,
      channel: { id: "c1" },
    });
    mockAuthz.assertChannelReadable.mockRejectedValue(new ForbiddenException());

    await expect(service.toggle("m1", "outsider", "👍")).rejects.toThrow(ForbiddenException);
  });
});
