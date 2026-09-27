import { Test, TestingModule } from "@nestjs/testing";
import { ModerationAuditService } from "./moderation-audit.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  moderationAuditEvent: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe("ModerationAuditService", () => {
  let service: ModerationAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationAuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ModerationAuditService);
    jest.clearAllMocks();
  });

  it("strips message body fields from metadata", async () => {
    mockPrisma.moderationAuditEvent.create.mockResolvedValue({});

    await service.record({
      serverId: "s1",
      actorUserId: "a1",
      action: "REPORT_RESOLVED",
      metadata: { messageContent: "secret", reasonCode: "spam" },
    });

    expect(mockPrisma.moderationAuditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: JSON.stringify({ reasonCode: "spam" }),
        }),
      }),
    );
  });
});
