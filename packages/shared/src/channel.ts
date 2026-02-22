import { z } from "zod";

export const CHANNEL_TYPES = ["TEXT", "VOICE", "ANNOUNCEMENT"] as const;
export type ChannelType = (typeof CHANNEL_TYPES)[number];

export const createChannelSchema = z.object({
  name: z
    .string()
    .min(1, "Channel name is required")
    .max(100, "Channel name too long"),
  type: z.enum(CHANNEL_TYPES).default("TEXT"),
  topic: z.string().max(1024).optional(),
});

export const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(1024).optional().nullable(),
});

export type CreateChannelDto = z.infer<typeof createChannelSchema>;
export type UpdateChannelDto = z.infer<typeof updateChannelSchema>;

export interface ChannelResponse {
  id: string;
  serverId: string;
  name: string;
  topic: string | null;
  type: ChannelType;
  position: number;
  createdAt: string;
}
