"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateChannelSchema = exports.createChannelSchema = exports.CHANNEL_TYPES = void 0;
const zod_1 = require("zod");
exports.CHANNEL_TYPES = ["TEXT", "VOICE", "ANNOUNCEMENT"];
exports.createChannelSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, "Channel name is required")
        .max(100, "Channel name too long")
        .regex(/^[a-z0-9-]+$/, "Channel names must be lowercase with hyphens only"),
    type: zod_1.z.enum(exports.CHANNEL_TYPES).default("TEXT"),
    topic: zod_1.z.string().max(1024).optional(),
});
exports.updateChannelSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
    topic: zod_1.z.string().max(1024).optional().nullable(),
});
//# sourceMappingURL=channel.js.map