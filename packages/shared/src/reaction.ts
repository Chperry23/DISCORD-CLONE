import { z } from "zod";

export const reactionEmojiSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}a-zA-Z0-9_+-]+$/u, "Invalid emoji");

export const addReactionSchema = z.object({
  emoji: reactionEmojiSchema,
});

export type AddReactionDto = z.infer<typeof addReactionSchema>;

export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
  reactedByMe: boolean;
}
