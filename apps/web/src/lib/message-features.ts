import { api } from "./api";
import type { MessageResponse, ThreadInfoResponse, InAppNotificationResponse } from "@discord-clone/shared";

export async function toggleReaction(channelId: string, messageId: string, emoji: string) {
  return api.post<MessageResponse>(`/channels/${channelId}/messages/${messageId}/reactions`, {
    emoji,
  });
}

export async function pinMessage(channelId: string, messageId: string) {
  return api.post<MessageResponse>(`/channels/${channelId}/messages/${messageId}/pin`, {});
}

export async function unpinMessage(channelId: string, messageId: string) {
  return api.delete<MessageResponse>(`/channels/${channelId}/messages/${messageId}/pin`);
}

export async function listPins(channelId: string) {
  return api.get<MessageResponse[]>(`/channels/${channelId}/pins`);
}

export async function createThread(channelId: string, messageId: string, name?: string) {
  return api.post<ThreadInfoResponse>(`/channels/${channelId}/messages/${messageId}/thread`, {
    name,
  });
}

export async function getThread(channelId: string, messageId: string) {
  return api.get<ThreadInfoResponse | null>(
    `/channels/${channelId}/messages/${messageId}/thread`,
  );
}

export async function listNotifications() {
  return api.get<InAppNotificationResponse[]>("/notifications");
}

export async function markNotificationRead(id: string) {
  return api.patch<InAppNotificationResponse>(`/notifications/${id}/read`, {});
}
