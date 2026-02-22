"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferOwnershipSchema = exports.updateNicknameSchema = exports.createInviteSchema = exports.updateServerSchema = exports.createServerSchema = void 0;
const zod_1 = require("zod");
exports.createServerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Server name must be at least 2 characters")
        .max(100, "Server name must be at most 100 characters"),
    description: zod_1.z.string().max(512).optional(),
    visibility: zod_1.z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
});
exports.updateServerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().max(512).optional().nullable(),
    visibility: zod_1.z.enum(["PUBLIC", "PRIVATE"]).optional(),
});
exports.createInviteSchema = zod_1.z.object({
    maxUses: zod_1.z.number().int().min(1).max(1000).optional().nullable(),
    expiresInHours: zod_1.z.number().int().min(1).max(720).optional().nullable(),
});
exports.updateNicknameSchema = zod_1.z.object({
    nickname: zod_1.z.string().min(1).max(64).optional().nullable(),
});
exports.transferOwnershipSchema = zod_1.z.object({
    newOwnerId: zod_1.z.string().uuid("Invalid user ID"),
});
//# sourceMappingURL=server.js.map