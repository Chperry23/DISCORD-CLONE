import { z } from "zod";

export const FRIENDSHIP_STATUSES = ["PENDING", "ACCEPTED", "BLOCKED"] as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

export const sendFriendRequestSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
});

export type SendFriendRequestDto = z.infer<typeof sendFriendRequestSchema>;

export interface FriendUserSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface FriendshipResponse {
  id: string;
  status: FriendshipStatus;
  direction: "incoming" | "outgoing" | "none";
  createdAt: string;
  user: FriendUserSummary;
}
