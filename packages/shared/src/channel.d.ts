import { z } from "zod";
export declare const CHANNEL_TYPES: readonly ["TEXT", "VOICE", "ANNOUNCEMENT"];
export type ChannelType = (typeof CHANNEL_TYPES)[number];
export declare const createChannelSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["TEXT", "VOICE", "ANNOUNCEMENT"]>>;
    topic: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "TEXT" | "VOICE" | "ANNOUNCEMENT";
    topic?: string | undefined;
}, {
    name: string;
    type?: "TEXT" | "VOICE" | "ANNOUNCEMENT" | undefined;
    topic?: string | undefined;
}>;
export declare const updateChannelSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    topic: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    topic?: string | null | undefined;
}, {
    name?: string | undefined;
    topic?: string | null | undefined;
}>;
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
