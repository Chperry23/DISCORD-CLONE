import { z } from "zod";
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
}, {
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
}>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
