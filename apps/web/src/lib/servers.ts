import type {
  ServerResponse,
  MemberResponse,
  InviteResponse,
  CreateServerDto,
  UpdateServerDto,
  CreateInviteDto,
} from "@discord-clone/shared";
import { api } from "./api";

export async function getMyServers(): Promise<ServerResponse[]> {
  return api.get<ServerResponse[]>("/servers/mine");
}

export async function getServer(id: string): Promise<ServerResponse> {
  return api.get<ServerResponse>(`/servers/${id}`);
}

export async function createServer(data: CreateServerDto): Promise<ServerResponse> {
  return api.post<ServerResponse>("/servers", data);
}

export async function updateServer(id: string, data: UpdateServerDto): Promise<ServerResponse> {
  return api.patch<ServerResponse>(`/servers/${id}`, data);
}

export async function deleteServer(id: string): Promise<void> {
  await api.delete(`/servers/${id}`);
}

export async function getMembers(serverId: string): Promise<MemberResponse[]> {
  return api.get<MemberResponse[]>(`/servers/${serverId}/members`);
}

export async function joinServer(serverId: string): Promise<MemberResponse> {
  return api.post<MemberResponse>(`/servers/${serverId}/members/join`, {});
}

export async function leaveServer(serverId: string): Promise<void> {
  await api.post(`/servers/${serverId}/members/leave`, {});
}

export async function createInvite(
  serverId: string,
  data: CreateInviteDto,
): Promise<InviteResponse> {
  return api.post<InviteResponse>(`/servers/${serverId}/invites`, data);
}

export async function getInviteByCode(code: string): Promise<InviteResponse> {
  return api.get<InviteResponse>(`/invites/${code}`);
}

export async function useInvite(code: string): Promise<MemberResponse> {
  return api.post<MemberResponse>(`/invites/${code}/use`, {});
}

export async function discoverServers(
  cursor?: string,
): Promise<{ servers: ServerResponse[]; nextCursor: string | null }> {
  const params = cursor ? `?cursor=${cursor}` : "";
  return api.get(`/servers/discover${params}`);
}
