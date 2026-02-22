import { Test, TestingModule } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  $queryRaw: jest.fn(),
};

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it("should return healthy when DB is connected", async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

    const result = await controller.check();

    expect(result.status).toBe("healthy");
    expect(result.services.database).toBe("ok");
  });

  it("should return degraded when DB fails", async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error("Connection refused"));

    const result = await controller.check();

    expect(result.status).toBe("degraded");
    expect(result.services.database).toBe("error");
  });
});
