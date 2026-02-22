"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsEventPayloadSchema = exports.SERVER_ANALYTICS_EVENTS = exports.AUTH_ANALYTICS_EVENTS = void 0;
const zod_1 = require("zod");
exports.AUTH_ANALYTICS_EVENTS = {
    USER_REGISTERED: "user_registered",
    USER_LOGGED_IN: "user_logged_in",
    LOGIN_FAILED: "login_failed",
};
exports.SERVER_ANALYTICS_EVENTS = {
    SERVER_CREATED: "server_created",
    MEMBER_JOINED: "member_joined",
    MEMBER_LEFT: "member_left",
    INVITE_CREATED: "invite_created",
    INVITE_USED: "invite_used",
    OWNERSHIP_TRANSFERRED: "ownership_transferred",
};
exports.analyticsEventPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid().optional().nullable(),
    serverId: zod_1.z.string().uuid().optional().nullable(),
    name: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.unknown()).optional().default({}),
    createdAt: zod_1.z.coerce.date().optional(),
});
//# sourceMappingURL=analytics-events.js.map