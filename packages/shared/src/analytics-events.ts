import { z } from "zod";

export const AUTH_ANALYTICS_EVENTS = {
  USER_REGISTERED: "user_registered",
  USER_LOGGED_IN: "user_logged_in",
  LOGIN_FAILED: "login_failed",
} as const;

export const SERVER_ANALYTICS_EVENTS = {
  SERVER_CREATED: "server_created",
  MEMBER_JOINED: "member_joined",
  MEMBER_LEFT: "member_left",
  INVITE_CREATED: "invite_created",
  INVITE_USED: "invite_used",
  OWNERSHIP_TRANSFERRED: "ownership_transferred",
} as const;

export type AuthAnalyticsEventName = (typeof AUTH_ANALYTICS_EVENTS)[keyof typeof AUTH_ANALYTICS_EVENTS];
export type ServerAnalyticsEventName = (typeof SERVER_ANALYTICS_EVENTS)[keyof typeof SERVER_ANALYTICS_EVENTS];

/** Base analytics event payload schema */
export const analyticsEventPayloadSchema = z.object({
  userId: z.string().uuid().optional().nullable(),
  serverId: z.string().uuid().optional().nullable(),
  name: z.string(),
  payload: z.record(z.unknown()).optional().default({}),
  createdAt: z.coerce.date().optional(),
});

export type AnalyticsEventPayload = z.infer<typeof analyticsEventPayloadSchema>;
