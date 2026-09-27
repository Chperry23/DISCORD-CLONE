import { z } from "zod";

export const MODERATION_ACTIONS = [
  "BAN",
  "UNBAN",
  "KICK",
  "ROLE_CHANGE",
  "REPORT_RESOLVED",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const banMemberSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(8760).optional().nullable(),
  deleteMessageDays: z.number().int().min(0).max(7).optional(),
});

export const moderationAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

export type BanMemberDto = z.infer<typeof banMemberSchema>;

export interface ServerBanResponse {
  id: string;
  serverId: string;
  userId: string;
  bannedById: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface ModerationAuditEventResponse {
  id: string;
  serverId: string;
  actorUserId: string;
  action: ModerationAction;
  targetUserId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
