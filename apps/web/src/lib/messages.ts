import type { MessagePage } from "@discord-clone/shared";
import { api } from "./api";

export async function getMessages(channelId: string, cursor?: string): Promise<MessagePage> {
  const params = cursor ? `?cursor=${cursor}` : "";
  return api.get<MessagePage>(`/channels/${channelId}/messages${params}`);
}

export async function sendMessage(channelId: string, content: string) {
  return api.post(`/channels/${channelId}/messages`, { content });
}
