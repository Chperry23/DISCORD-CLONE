import { z } from "zod";

export const deleteAccountSchema = z.object({
  password: z.string().min(8),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "You must confirm account deletion" }),
  }),
});

export type DeleteAccountDto = z.infer<typeof deleteAccountSchema>;

export interface UserDataExportJobResponse {
  id: string;
  status: "PENDING" | "READY" | "FAILED";
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadToken: string | null;
}

export interface UserDataExportPayload {
  exportedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  };
  memberships: Array<{
    serverId: string;
    serverName: string;
    role: string;
    joinedAt: string;
  }>;
  channelMessages: Array<{
    id: string;
    channelId: string;
    serverId: string;
    content: string;
    createdAt: string;
  }>;
  directMessages: Array<{
    id: string;
    conversationId: string;
    content: string;
    createdAt: string;
  }>;
  friendships: Array<{
    id: string;
    status: string;
    otherUserId: string;
    createdAt: string;
  }>;
  analyticsEventCount: number;
}
