import { z } from "zod";

export const createThreadSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;

export interface ThreadInfoResponse {
  threadChannelId: string;
  parentMessageId: string;
  parentChannelId: string;
  name: string;
}
