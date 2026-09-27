import { Injectable } from "@nestjs/common";
import type { Server } from "socket.io";

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attachServer(server: Server) {
    this.server = server;
  }

  emitDmMessage(conversationId: string, message: unknown) {
    this.server?.to(`dm:${conversationId}`).emit("dm:message:new", message);
  }

  emitPresenceForServer(serverId: string, payload: { userId: string; status: string }) {
    this.server?.to(`server:${serverId}:presence`).emit("presence:update", payload);
  }

  emitChannelEvent(channelId: string, event: string, payload: unknown) {
    this.server?.to(`channel:${channelId}`).emit(event, payload);
  }

  emitUserNotification(userId: string, notification: unknown) {
    this.server?.to(`user:${userId}`).emit("notification:new", notification);
  }
}
