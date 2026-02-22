import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
