import { z } from "zod";
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const editMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type EditMessageDto = z.infer<typeof editMessageSchema>;
export interface MessageAuthor {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
}
export interface MessageResponse {
    id: string;
    channelId: string;
    content: string;
    author: MessageAuthor;
    editedAt: string | null;
    deleted: boolean;
    createdAt: string;
}
export interface MessagePage {
    messages: MessageResponse[];
    nextCursor: string | null;
}
