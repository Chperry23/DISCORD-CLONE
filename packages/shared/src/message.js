"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.editMessageSchema = exports.sendMessageSchema = void 0;
const zod_1 = require("zod");
exports.sendMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
});
exports.editMessageSchema = zod_1.z.object({
    content: zod_1.z.string().min(1).max(4000),
});
//# sourceMappingURL=message.js.map