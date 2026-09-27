import type { Socket } from "socket.io-client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface PeerInfo {
  userId: string;
  username: string;
  displayName: string | null;
  connection: RTCPeerConnection;
  audioStream: MediaStream | null;
  screenStream: MediaStream | null;
}

type OnRemoteStream = (userId: string, stream: MediaStream, kind: "audio" | "screen") => void;
type OnPeerDisconnected = (userId: string) => void;

export class WebRTCManager {
  private peers = new Map<string, PeerInfo>();
  private localMicStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private channelId: string;
  private socket: Socket;
  private onRemoteStream: OnRemoteStream;
  private onPeerDisconnected: OnPeerDisconnected;
  private destroyed = false;

  constructor(
    socket: Socket,
    channelId: string,
    onRemoteStream: OnRemoteStream,
    onPeerDisconnected: OnPeerDisconnected,
  ) {
    this.socket = socket;
    this.channelId = channelId;
    this.onRemoteStream = onRemoteStream;
    this.onPeerDisconnected = onPeerDisconnected;

    this.socket.on("rtc:offer", this.handleOffer);
    this.socket.on("rtc:answer", this.handleAnswer);
    this.socket.on("rtc:ice-candidate", this.handleIceCandidate);
    this.socket.on("rtc:peer-joined", this.handlePeerJoined);
    this.socket.on("rtc:peer-left", this.handlePeerLeft);
    this.socket.on("rtc:existing-peers", this.handleExistingPeers);
  }

  setLocalMicStream(stream: MediaStream | null) {
    this.localMicStream = stream;
    for (const [, peer] of this.peers) {
      const senders = peer.connection.getSenders();
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (stream) {
        const track = stream.getAudioTracks()[0];
        if (track) {
          if (audioSender) {
            audioSender.replaceTrack(track);
          } else {
            peer.connection.addTrack(track, stream);
          }
        }
      } else if (audioSender) {
        audioSender.replaceTrack(null);
      }
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" } as MediaTrackConstraints,
      audio: true,
    });

    this.localScreenStream = stream;

    stream.getVideoTracks()[0]?.addEventListener("ended", () => {
      this.stopScreenShare();
    });

    for (const [, peer] of this.peers) {
      for (const track of stream.getTracks()) {
        peer.connection.addTrack(track, stream);
      }
    }

    this.socket.emit("rtc:screen-share-started", { channelId: this.channelId });
    return stream;
  }

  stopScreenShare() {
    if (!this.localScreenStream) return;

    for (const track of this.localScreenStream.getTracks()) {
      track.stop();
      for (const [, peer] of this.peers) {
        const sender = peer.connection.getSenders().find((s) => s.track === track);
        if (sender) {
          peer.connection.removeTrack(sender);
        }
      }
    }

    this.localScreenStream = null;
    this.socket.emit("rtc:screen-share-stopped", { channelId: this.channelId });
  }

  private createPeerConnection(userId: string, username: string, displayName: string | null): PeerInfo {
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const peerInfo: PeerInfo = {
      userId,
      username,
      displayName,
      connection,
      audioStream: null,
      screenStream: null,
    };

    if (this.localMicStream) {
      for (const track of this.localMicStream.getAudioTracks()) {
        connection.addTrack(track, this.localMicStream);
      }
    }

    if (this.localScreenStream) {
      for (const track of this.localScreenStream.getTracks()) {
        connection.addTrack(track, this.localScreenStream);
      }
    }

    connection.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;

      const hasVideo = stream.getVideoTracks().length > 0;
      if (hasVideo) {
        peerInfo.screenStream = stream;
        this.onRemoteStream(userId, stream, "screen");
      } else {
        peerInfo.audioStream = stream;
        this.onRemoteStream(userId, stream, "audio");
      }
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("rtc:ice-candidate", {
          targetUserId: userId,
          candidate: event.candidate.toJSON(),
          channelId: this.channelId,
        });
      }
    };

    connection.oniceconnectionstatechange = () => {
      if (connection.iceConnectionState === "failed" || connection.iceConnectionState === "disconnected") {
        this.removePeer(userId);
      }
    };

    this.peers.set(userId, peerInfo);
    return peerInfo;
  }

  private async createOffer(userId: string, username: string, displayName: string | null) {
    if (this.destroyed) return;
    const peer = this.createPeerConnection(userId, username, displayName);

    const offer = await peer.connection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await peer.connection.setLocalDescription(offer);

    this.socket.emit("rtc:offer", {
      targetUserId: userId,
      offer: peer.connection.localDescription,
      channelId: this.channelId,
    });
  }

  private handleExistingPeers = (data: {
    channelId: string;
    users: Array<{ userId: string; username: string; displayName: string | null }>;
  }) => {
    if (data.channelId !== this.channelId) return;
    for (const user of data.users) {
      this.createOffer(user.userId, user.username, user.displayName);
    }
  };

  private handlePeerJoined = (_data: { userId: string; username: string; displayName: string | null }) => {
    // New peer joined - they will send us an offer, we wait
  };

  private handleOffer = async (data: {
    fromUserId: string;
    offer: RTCSessionDescriptionInit;
    channelId: string;
  }) => {
    if (this.destroyed || data.channelId !== this.channelId) return;

    let peer = this.peers.get(data.fromUserId);
    if (!peer) {
      peer = this.createPeerConnection(data.fromUserId, "", null);
    }

    await peer.connection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    this.socket.emit("rtc:answer", {
      targetUserId: data.fromUserId,
      answer: peer.connection.localDescription,
      channelId: this.channelId,
    });
  };

  private handleAnswer = async (data: {
    fromUserId: string;
    answer: RTCSessionDescriptionInit;
    channelId: string;
  }) => {
    if (this.destroyed || data.channelId !== this.channelId) return;
    const peer = this.peers.get(data.fromUserId);
    if (!peer) return;
    await peer.connection.setRemoteDescription(new RTCSessionDescription(data.answer));
  };

  private handleIceCandidate = async (data: {
    fromUserId: string;
    candidate: RTCIceCandidateInit;
    channelId: string;
  }) => {
    if (this.destroyed || data.channelId !== this.channelId) return;
    const peer = this.peers.get(data.fromUserId);
    if (!peer) return;
    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch {
      // ICE candidate may arrive before remote description is set
    }
  };

  private handlePeerLeft = (data: { userId: string }) => {
    this.removePeer(data.userId);
    this.onPeerDisconnected(data.userId);
  };

  private removePeer(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(userId);
    }
  }

  destroy() {
    this.destroyed = true;

    for (const [, peer] of this.peers) {
      peer.connection.close();
    }
    this.peers.clear();

    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach((t) => t.stop());
      this.localMicStream = null;
    }

    this.stopScreenShare();

    this.socket.off("rtc:offer", this.handleOffer);
    this.socket.off("rtc:answer", this.handleAnswer);
    this.socket.off("rtc:ice-candidate", this.handleIceCandidate);
    this.socket.off("rtc:peer-joined", this.handlePeerJoined);
    this.socket.off("rtc:peer-left", this.handlePeerLeft);
    this.socket.off("rtc:existing-peers", this.handleExistingPeers);
  }

  getPeers(): Map<string, PeerInfo> {
    return this.peers;
  }
}
