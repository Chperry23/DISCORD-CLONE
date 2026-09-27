import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import type { MessageSearchQuery, MessageSearchResult } from "@discord-clone/shared";

type FtsRow = {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: Date;
  rank: number;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  async searchMessages(userId: string, query: MessageSearchQuery): Promise<MessageSearchResult> {
    await this.authz.assertMembership(query.serverId, userId);

    if (query.channelId) {
      const channel = await this.authz.assertChannelReadable(query.channelId, userId);
      if (channel.serverId !== query.serverId) {
        throw new ForbiddenException("Channel does not belong to server");
      }
    }

    const q = query.q.trim();
    const limit = query.limit;

    const rows = query.channelId
      ? await this.prisma.$queryRaw<FtsRow[]>`
          SELECT m.id,
                 m.channel_id,
                 m.author_id,
                 m.content,
                 m.created_at,
                 ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', ${q})) AS rank
          FROM messages m
          WHERE m.channel_id = ${query.channelId}
            AND m.deleted = false
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', ${q})
          ORDER BY rank DESC, m.created_at DESC
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<FtsRow[]>`
          SELECT m.id,
                 m.channel_id,
                 m.author_id,
                 m.content,
                 m.created_at,
                 ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', ${q})) AS rank
          FROM messages m
          INNER JOIN channels c ON c.id = m.channel_id
          WHERE c.server_id = ${query.serverId}
            AND m.deleted = false
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', ${q})
          ORDER BY rank DESC, m.created_at DESC
          LIMIT ${limit}
        `;

    return {
      query: q,
      hits: rows.map((row) => ({
        id: row.id,
        channelId: row.channel_id,
        authorId: row.author_id,
        content: row.content,
        createdAt: row.created_at.toISOString(),
        rank: Number(row.rank),
      })),
    };
  }
}
