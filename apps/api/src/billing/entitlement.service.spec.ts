import { EntitlementService } from "./entitlement.service";

const mockPrisma = {
  entitlement: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe("EntitlementService", () => {
  let service: EntitlementService;

  beforeEach(() => {
    service = new EntitlementService(mockPrisma as never);
    jest.clearAllMocks();
  });

  describe("hasActiveServerBoost", () => {
    it("returns true when an active boost exists", async () => {
      mockPrisma.entitlement.count.mockResolvedValue(1);
      await expect(service.hasActiveServerBoost("srv-1")).resolves.toBe(true);
      expect(mockPrisma.entitlement.count).toHaveBeenCalledWith({
        where: { serverId: "srv-1", kind: "SERVER_BOOST", status: "ACTIVE" },
      });
    });
  });

  describe("hasActiveProfileBadge", () => {
    it("returns false when no badge entitlement", async () => {
      mockPrisma.entitlement.count.mockResolvedValue(0);
      await expect(service.hasActiveProfileBadge("u1")).resolves.toBe(false);
    });
  });

  describe("upsertFromCheckoutSession", () => {
    it("is idempotent for the same stripe event id", async () => {
      mockPrisma.entitlement.findUnique.mockResolvedValue({
        id: "e1",
        lastStripeEventId: "evt_dup",
      });

      const result = await service.upsertFromCheckoutSession({
        userId: "u1",
        kind: "PROFILE_BADGE",
        serverId: null,
        sessionId: "cs_1",
        subscriptionId: null,
        validUntil: null,
        stripeEventId: "evt_dup",
      });

      expect(result.id).toBe("e1");
      expect(mockPrisma.entitlement.create).not.toHaveBeenCalled();
    });
  });
});
