import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { MessageService } from "./message.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";
import { MetricsService } from "../common/metrics/metrics.service";

const mockPrisma = {
  message: { findMany: jest.fn(), create: jest.fn() },
};

const mockAnalytics = { track: jest.fn() };
const mockAuthz = {
  assertChannelReadable: jest.fn(),
};
const mockMetrics = {
  trackOperation: jest.fn((_op: string, fn: () => Promise<unknown>) => fn()),
};

describe("MessageService authz", () => {
  let service: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AnalyticsService, useValue: mockAnalytics },
        { provide: AuthzService, useValue: mockAuthz },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("checks channel membership before listing messages", async () => {
      mockAuthz.assertChannelReadable.mockRejectedValue(
        new ForbiddenException("You must be a member of this server"),
      );

      await expect(service.list("channel-1", "outsider")).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.message.findMany).not.toHaveBeenCalled();
    });

    it("lists messages when authorized", async () => {
      mockAuthz.assertChannelReadable.mockResolvedValue({
        id: "channel-1",
        serverId: "server-1",
      });
      mockPrisma.message.findMany.mockResolvedValue([]);

      await service.list("channel-1", "member-1");
      expect(mockPrisma.message.findMany).toHaveBeenCalled();
    });
  });
});
