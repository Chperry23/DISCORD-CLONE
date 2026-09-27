import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, BadRequestException } from "@nestjs/common";
import * as argon2 from "argon2";
import { PrivacyService } from "./privacy.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("argon2");

const mockPrisma = {
  userDataExportJob: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  user: { findUnique: jest.fn(), delete: jest.fn() },
  member: { findMany: jest.fn() },
  message: { findMany: jest.fn() },
  directMessage: { findMany: jest.fn() },
  friendship: { findMany: jest.fn() },
  analyticsEvent: { count: jest.fn() },
  server: { count: jest.fn() },
};

describe("PrivacyService", () => {
  let service: PrivacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrivacyService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(PrivacyService);
    jest.clearAllMocks();
  });

  describe("deleteAccount", () => {
    it("requires password confirmation", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        password: "hash",
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.deleteAccount("u1", { password: "wrong", confirm: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("blocks deletion when user still owns servers", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "u1",
        password: "hash",
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockPrisma.server.count.mockResolvedValue(1);

      await expect(
        service.deleteAccount("u1", { password: "goodpass", confirm: true }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
