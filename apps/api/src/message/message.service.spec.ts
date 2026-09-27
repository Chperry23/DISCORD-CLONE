import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MessageService } from "./message.service";
import { PrismaService } from "../prisma/prisma.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { AuthzService } from "../authz/authz.service";
import { MetricsService } from "../common/metrics/metrics.service";
import { AttachmentService } from "./attachment.service";
import { NotificationService } from "../notification/notification.service";
import { RealtimeService } from "../realtime/realtime.service";

const mockPrisma = {
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findUnique: jest.fn(),
  },
  member: { findMany: jest.fn() },
};

const mockAnalytics = { track: jest.fn() };
const mockAuthz = {
  assertChannelReadable: jest.fn(),
};
const mockMetrics = {
  trackOperation: jest.fn((_op: string, fn: () => Promise<unknown>) => fn()),
};
const mockAttachments = { bindAttachmentsToMessage: jest.fn() };
const mockNotifications = { createMentionNotifications: jest.fn() };
const mockRealtime = { emitChannelEvent: jest.fn() };
const mockConfig = { get: jest.fn(() => "api") };

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
        { provide: AttachmentService, useValue: mockAttachments },
        { provide: NotificationService, useValue: mockNotifications },
        { provide: RealtimeService, useValue: mockRealtime },
        { provide: ConfigService, useValue: mockConfig },
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

  describe("send mentions", () => {
    it("creates mention notifications for server members", async () => {
      mockAuthz.assertChannelReadable.mockResolvedValue({
        id: "channel-1",
        serverId: "server-1",
      });
      mockPrisma.message.create.mockResolvedValue({
        id: "msg-1",
        channelId: "channel-1",
        content: "hi @bob",
        author: { id: "author-1", username: "alice" },
      });
      mockPrisma.message.findUniqueOrThrow.mockResolvedValue({
        id: "msg-1",
        channelId: "channel-1",
        content: "hi @bob",
        editedAt: null,
        deleted: false,
        createdAt: new Date(),
        author: { id: "author-1", username: "alice", displayName: null, avatarUrl: null },
        attachments: [],
        reactions: [],
        pin: null,
        threadChannel: null,
      });
      mockPrisma.member.findMany.mockResolvedValue([
        {
          user: { id: "user-bob", username: "bob" },
        },
      ]);

      await service.send("channel-1", "author-1", { content: "hi @bob" });

      expect(mockNotifications.createMentionNotifications).toHaveBeenCalledWith(
        expect.objectContaining({
          mentionedUserIds: ["user-bob"],
          actorId: "author-1",
        }),
      );
    });
  });
});
