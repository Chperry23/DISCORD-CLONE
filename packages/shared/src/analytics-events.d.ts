import { z } from "zod";
export declare const AUTH_ANALYTICS_EVENTS: {
    readonly USER_REGISTERED: "user_registered";
    readonly USER_LOGGED_IN: "user_logged_in";
    readonly LOGIN_FAILED: "login_failed";
};
export declare const SERVER_ANALYTICS_EVENTS: {
    readonly SERVER_CREATED: "server_created";
    readonly MEMBER_JOINED: "member_joined";
    readonly MEMBER_LEFT: "member_left";
    readonly INVITE_CREATED: "invite_created";
    readonly INVITE_USED: "invite_used";
    readonly OWNERSHIP_TRANSFERRED: "ownership_transferred";
};
export type AuthAnalyticsEventName = (typeof AUTH_ANALYTICS_EVENTS)[keyof typeof AUTH_ANALYTICS_EVENTS];
export type ServerAnalyticsEventName = (typeof SERVER_ANALYTICS_EVENTS)[keyof typeof SERVER_ANALYTICS_EVENTS];
export declare const analyticsEventPayloadSchema: z.ZodObject<{
    userId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    serverId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodString;
    payload: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    createdAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    name: string;
    payload: Record<string, unknown>;
    userId?: string | null | undefined;
    serverId?: string | null | undefined;
    createdAt?: Date | undefined;
}, {
    name: string;
    userId?: string | null | undefined;
    serverId?: string | null | undefined;
    payload?: Record<string, unknown> | undefined;
    createdAt?: Date | undefined;
}>;
export type AnalyticsEventPayload = z.infer<typeof analyticsEventPayloadSchema>;
