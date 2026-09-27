import { z } from "zod";

export const createServerSchema = z.object({
  name: z
    .string()
    .min(2, "Server name must be at least 2 characters")
    .max(100, "Server name must be at most 100 characters"),
  description: z.string().max(512).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
});

export const updateServerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(512).optional().nullable(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export const createInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(1000).optional().nullable(),
  expiresInHours: z.number().int().min(1).max(720).optional().nullable(),
});

export const updateNicknameSchema = z.object({
  nickname: z.string().min(1).max(64).optional().nullable(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]),
});

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string().uuid("Invalid user ID"),
});

export type CreateServerDto = z.infer<typeof createServerSchema>;
export type UpdateServerDto = z.infer<typeof updateServerSchema>;
export type CreateInviteDto = z.infer<typeof createInviteSchema>;
export type UpdateNicknameDto = z.infer<typeof updateNicknameSchema>;
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;

export interface ServerResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  ownerId: string;
  visibility: "PUBLIC" | "PRIVATE";
  memberCount: number;
  createdAt: string;
  /** Cosmetic server boost (paid entitlement); does not gate chat access. */
  boostActive?: boolean;
}

export interface MemberResponse {
  id: string;
  userId: string;
  serverId: string;
  nickname: string | null;
  role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
  joinedAt: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    /** Cosmetic profile badge (paid entitlement). */
    profileBadge?: boolean;
  };
}

export interface InviteResponse {
  id: string;
  code: string;
  serverId: string;
  maxUses: number | null;
  uses: number;
  expiresAt: string | null;
  createdAt: string;
  server: {
    id: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
  };
}
