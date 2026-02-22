"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).max(64).optional(),
    avatarUrl: zod_1.z.string().url().optional().nullable(),
});
//# sourceMappingURL=profile.js.map