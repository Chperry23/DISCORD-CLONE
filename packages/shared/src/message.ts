import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(4000, "Message too long"),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type EditMessageDto = z.infer<typeof editMessageSchema>;

export interface MessageAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface MessageResponse {
  id: string;
  channelId: string;
  content: string;
  author: MessageAuthor;
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
}

export interface MessagePage {
  messages: MessageResponse[];
  nextCursor: string | null;
}
