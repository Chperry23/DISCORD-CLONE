import { z } from "zod";

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export const userSearchQuerySchema = z.object({
  q: z.string().min(2).max(32),
});
