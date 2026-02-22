import { api } from "./api";

export interface DmConversation {
  id: string;
  recipient: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessage?: { content: string; createdAt: string } | null;
  updatedAt: string;
}

export interface DmMessage {
  id: string;
  conversationId: string;
  content: string;
  editedAt: string | null;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function getConversations(): Promise<DmConversation[]> {
  return api.get<DmConversation[]>("/dm/conversations");
}

export async function createConversation(targetUserId: string): Promise<DmConversation> {
  return api.post<DmConversation>("/dm/conversations", { targetUserId });
}

export async function getDmMessages(conversationId: string, cursor?: string): Promise<{ messages: DmMessage[]; nextCursor: string | null }> {
  const params = cursor ? `?cursor=${cursor}` : "";
  return api.get(`/dm/conversations/${conversationId}/messages${params}`);
}

export async function sendDmMessage(conversationId: string, content: string): Promise<DmMessage> {
  return api.post<DmMessage>(`/dm/conversations/${conversationId}/messages`, { content });
}
