import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import { MessageService } from "./message.service";
import { PrismaService } from "../prisma/prisma.service";

interface VoiceUser {
  userId: string;
  username: string;
  displayName: string | null;
  muted: boolean;
  deafened: boolean;
  screenSharing: boolean;
  socketId: string;
}

@WebSocketGateway({
  cors: { origin: "*" },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private userMap = new Map<string, { userId: string; username: string; displayName: string | null }>();
  private voiceChannels = new Map<string, Map<string, VoiceUser>>();
  private userToSocket = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as Record<string, string>)?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, displayName: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      this.userMap.set(client.id, {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
      });
      this.userToSocket.set(user.id, client.id);
      this.logger.log(`Connected: ${user.username}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const info = this.userMap.get(client.id);
    if (info) {
      this.logger.log(`Disconnected: ${info.username}`);
      this.removeFromAllVoiceChannels(client, info.userId);
      this.userToSocket.delete(info.userId);
      this.userMap.delete(client.id);
    }
  }

  private getUserId(client: Socket): string | null {
    return this.userMap.get(client.id)?.userId ?? null;
  }

  private getUsername(client: Socket): string | null {
    return this.userMap.get(client.id)?.username ?? null;
  }

  private getVoiceUsers(channelId: string): VoiceUser[] {
    const channel = this.voiceChannels.get(channelId);
    return channel ? Array.from(channel.values()) : [];
  }

  private removeFromAllVoiceChannels(client: Socket, userId: string) {
    for (const [channelId, users] of this.voiceChannels.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        if (users.size === 0) {
          this.voiceChannels.delete(channelId);
        }
        this.server.to(`voice:${channelId}`).emit("voice:state", {
          channelId,
          users: this.getVoiceUsers(channelId),
        });
        this.server.to(`voice:${channelId}`).emit("rtc:peer-left", { userId });
        client.leave(`voice:${channelId}`);
      }
    }
  }

  // ── Text channels ──────────────────────────────────

  @SubscribeMessage("channel:join")
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;
    await client.join(`channel:${data.channelId}`);
  }

  @SubscribeMessage("channel:leave")
  async handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    await client.leave(`channel:${data.channelId}`);
  }

  @SubscribeMessage("message:send")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;

    try {
      const message = await this.messageService.send(data.channelId, userId, data.content);
      this.server.to(`channel:${data.channelId}`).emit("message:new", message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      client.emit("error", { message: msg });
    }
  }

  @SubscribeMessage("message:edit")
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string; channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;

    try {
      const message = await this.messageService.edit(data.messageId, userId, data.content);
      this.server.to(`channel:${data.channelId}`).emit("message:update", message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to edit message";
      client.emit("error", { message: msg });
    }
  }

  @SubscribeMessage("message:delete")
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;

    try {
      await this.messageService.delete(data.messageId, userId);
      this.server.to(`channel:${data.channelId}`).emit("message:delete", { messageId: data.messageId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete message";
      client.emit("error", { message: msg });
    }
  }

  @SubscribeMessage("typing:start")
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;
    client.to(`channel:${data.channelId}`).emit("typing:start", {
      userId,
      username: this.getUsername(client),
    });
  }

  @SubscribeMessage("typing:stop")
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.getUserId(client);
    if (!userId) return;
    client.to(`channel:${data.channelId}`).emit("typing:stop", { userId });
  }

  // ── Voice channels ─────────────────────────────────

  @SubscribeMessage("voice:join")
  async handleVoiceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    this.removeFromAllVoiceChannels(client, info.userId);

    if (!this.voiceChannels.has(data.channelId)) {
      this.voiceChannels.set(data.channelId, new Map());
    }

    const existingUsers = this.getVoiceUsers(data.channelId);

    const voiceUser: VoiceUser = {
      userId: info.userId,
      username: info.username,
      displayName: info.displayName,
      muted: false,
      deafened: false,
      screenSharing: false,
      socketId: client.id,
    };

    this.voiceChannels.get(data.channelId)!.set(info.userId, voiceUser);
    await client.join(`voice:${data.channelId}`);

    client.emit("rtc:existing-peers", {
      channelId: data.channelId,
      users: existingUsers.map((u) => ({
        userId: u.userId,
        username: u.username,
        displayName: u.displayName,
      })),
    });

    client.to(`voice:${data.channelId}`).emit("rtc:peer-joined", {
      userId: info.userId,
      username: info.username,
      displayName: info.displayName,
    });

    this.server.to(`voice:${data.channelId}`).emit("voice:state", {
      channelId: data.channelId,
      users: this.getVoiceUsers(data.channelId),
    });

    this.logger.log(`${info.username} joined voice ${data.channelId}`);
  }

  @SubscribeMessage("voice:leave")
  async handleVoiceLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    const channel = this.voiceChannels.get(data.channelId);
    if (channel) {
      channel.delete(info.userId);
      if (channel.size === 0) {
        this.voiceChannels.delete(data.channelId);
      }
    }

    await client.leave(`voice:${data.channelId}`);

    this.server.to(`voice:${data.channelId}`).emit("voice:state", {
      channelId: data.channelId,
      users: this.getVoiceUsers(data.channelId),
    });

    this.server.to(`voice:${data.channelId}`).emit("rtc:peer-left", {
      userId: info.userId,
    });

    client.emit("voice:state", {
      channelId: data.channelId,
      users: this.getVoiceUsers(data.channelId),
    });

    this.logger.log(`${info.username} left voice ${data.channelId}`);
  }

  @SubscribeMessage("voice:update")
  handleVoiceUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; muted?: boolean; deafened?: boolean; screenSharing?: boolean },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    const channel = this.voiceChannels.get(data.channelId);
    if (!channel) return;

    const voiceUser = channel.get(info.userId);
    if (!voiceUser) return;

    if (data.muted !== undefined) voiceUser.muted = data.muted;
    if (data.deafened !== undefined) voiceUser.deafened = data.deafened;
    if (data.screenSharing !== undefined) voiceUser.screenSharing = data.screenSharing;

    this.server.to(`voice:${data.channelId}`).emit("voice:state", {
      channelId: data.channelId,
      users: this.getVoiceUsers(data.channelId),
    });
  }

  @SubscribeMessage("voice:get")
  handleVoiceGet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    client.emit("voice:state", {
      channelId: data.channelId,
      users: this.getVoiceUsers(data.channelId),
    });
  }

  // ── WebRTC Signaling ───────────────────────────────

  @SubscribeMessage("rtc:offer")
  handleRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; offer: RTCSessionDescriptionInit; channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    const targetSocketId = this.userToSocket.get(data.targetUserId);
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit("rtc:offer", {
      fromUserId: info.userId,
      offer: data.offer,
      channelId: data.channelId,
    });
  }

  @SubscribeMessage("rtc:answer")
  handleRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; answer: RTCSessionDescriptionInit; channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    const targetSocketId = this.userToSocket.get(data.targetUserId);
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit("rtc:answer", {
      fromUserId: info.userId,
      answer: data.answer,
      channelId: data.channelId,
    });
  }

  @SubscribeMessage("rtc:ice-candidate")
  handleRtcIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; candidate: RTCIceCandidateInit; channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    const targetSocketId = this.userToSocket.get(data.targetUserId);
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit("rtc:ice-candidate", {
      fromUserId: info.userId,
      candidate: data.candidate,
      channelId: data.channelId,
    });
  }

  @SubscribeMessage("rtc:screen-share-started")
  handleScreenShareStarted(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    client.to(`voice:${data.channelId}`).emit("rtc:screen-share-started", {
      userId: info.userId,
    });
  }

  @SubscribeMessage("rtc:screen-share-stopped")
  handleScreenShareStopped(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const info = this.userMap.get(client.id);
    if (!info) return;

    client.to(`voice:${data.channelId}`).emit("rtc:screen-share-stopped", {
      userId: info.userId,
    });
  }
}
