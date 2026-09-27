import { z } from "zod";

export const sendMessageSchema = z
  .object({
    content: z.string().max(4000, "Message too long").default(""),
    attachmentIds: z.array(z.string().uuid()).max(10).optional(),
  })
  .refine(
    (d) => d.content.trim().length > 0 || (d.attachmentIds?.length ?? 0) > 0,
    { message: "Message cannot be empty" },
  );

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

import type { AttachmentResponse } from "./attachment";
import type { ReactionSummary } from "./reaction";

export interface MessageResponse {
  id: string;
  channelId: string;
  content: string;
  author: MessageAuthor;
  editedAt: string | null;
  deleted: boolean;
  createdAt: string;
  attachments: AttachmentResponse[];
  reactions: ReactionSummary[];
  pinned: boolean;
  threadChannelId: string | null;
}

export interface MessagePage {
  messages: MessageResponse[];
  nextCursor: string | null;
}
