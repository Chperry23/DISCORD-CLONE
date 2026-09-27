import type { UserSearchResult } from "@discord-clone/shared";
import { api } from "./api";

export async function searchUsers(q: string): Promise<UserSearchResult[]> {
  return api.get<UserSearchResult[]>(`/users/search?q=${encodeURIComponent(q)}`);
}
