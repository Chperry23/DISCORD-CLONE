import type { ChannelResponse, CreateChannelDto } from "@discord-clone/shared";
import { api } from "./api";

export async function getChannels(serverId: string): Promise<ChannelResponse[]> {
  return api.get<ChannelResponse[]>(`/servers/${serverId}/channels`);
}

export async function createChannel(
  serverId: string,
  data: CreateChannelDto,
): Promise<ChannelResponse> {
  return api.post<ChannelResponse>(`/servers/${serverId}/channels`, data);
}

export async function deleteChannel(serverId: string, channelId: string): Promise<void> {
  await api.delete(`/servers/${serverId}/channels/${channelId}`);
}
