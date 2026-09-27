export type NotificationType = "MENTION";

export interface InAppNotificationResponse {
  id: string;
  type: NotificationType;
  serverId: string | null;
  channelId: string | null;
  messageId: string | null;
  actorId: string | null;
  summary: string;
  readAt: string | null;
  createdAt: string;
}
