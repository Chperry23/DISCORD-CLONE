import { z } from "zod";

export const messageSearchQuerySchema = z.object({
  q: z.string().min(2).max(200),
  serverId: z.string().uuid(),
  channelId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export type MessageSearchQuery = z.infer<typeof messageSearchQuerySchema>;

export interface MessageSearchHit {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  rank: number;
}

export interface MessageSearchResult {
  hits: MessageSearchHit[];
  query: string;
}
