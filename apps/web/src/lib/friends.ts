import type { FriendshipResponse, SendFriendRequestDto } from "@discord-clone/shared";
import { api } from "./api";

export async function listFriends(): Promise<FriendshipResponse[]> {
  return api.get<FriendshipResponse[]>("/friends");
}

export async function sendFriendRequest(targetUserId: string): Promise<FriendshipResponse> {
  const body: SendFriendRequestDto = { targetUserId };
  return api.post<FriendshipResponse>("/friends/requests", body);
}

export async function acceptFriendRequest(id: string): Promise<FriendshipResponse> {
  return api.post<FriendshipResponse>(`/friends/requests/${id}/accept`, {});
}

export async function removeFriend(id: string): Promise<void> {
  await api.delete(`/friends/${id}`);
}

export async function blockUser(targetUserId: string): Promise<void> {
  await api.post("/friends/block", { targetUserId });
}

export async function unblockUser(targetUserId: string): Promise<void> {
  await api.delete(`/friends/block/${targetUserId}`);
}
