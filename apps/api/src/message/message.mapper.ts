import type {
  AttachmentResponse,
  MessageResponse,
  ReactionSummary,
} from "@discord-clone/shared";

type MessageWithRelations = {
  id: string;
  channelId: string;
  content: string;
  editedAt: Date | null;
  deleted: boolean;
  createdAt: Date;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  attachments?: {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
  }[];
  reactions?: { emoji: string; userId: string }[];
  pin?: { id: string } | null;
  threadChannel?: { id: string } | null;
};

export function mapMessageToResponse(
  msg: MessageWithRelations,
  viewerUserId: string,
  apiBasePath: string,
): MessageResponse {
  const attachments: AttachmentResponse[] = (msg.attachments ?? [])
    .filter((a) => a.status === "ATTACHED")
    .map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      downloadUrl: `${apiBasePath}/attachments/${a.id}/content`,
    }));

  const reactionMap = new Map<string, { count: number; userIds: string[] }>();
  for (const r of msg.reactions ?? []) {
    const entry = reactionMap.get(r.emoji) ?? { count: 0, userIds: [] };
    entry.count += 1;
    entry.userIds.push(r.userId);
    reactionMap.set(r.emoji, entry);
  }

  const reactions: ReactionSummary[] = [...reactionMap.entries()].map(([emoji, data]) => ({
    emoji,
    count: data.count,
    userIds: data.userIds,
    reactedByMe: data.userIds.includes(viewerUserId),
  }));

  return {
    id: msg.id,
    channelId: msg.channelId,
    content: msg.content,
    author: msg.author,
    editedAt: msg.editedAt?.toISOString() ?? null,
    deleted: msg.deleted,
    createdAt: msg.createdAt.toISOString(),
    attachments,
    reactions,
    pinned: Boolean(msg.pin),
    threadChannelId: msg.threadChannel?.id ?? null,
  };
}

export const messageInclude = {
  author: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  attachments: {
    select: { id: true, filename: true, mimeType: true, sizeBytes: true, status: true },
  },
  reactions: { select: { emoji: true, userId: true } },
  pin: { select: { id: true } },
  threadChannel: { select: { id: true } },
} as const;
