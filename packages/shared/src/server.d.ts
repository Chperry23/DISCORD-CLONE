import { z } from "zod";
export declare const createServerSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    visibility: z.ZodDefault<z.ZodEnum<["PUBLIC", "PRIVATE"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    visibility: "PUBLIC" | "PRIVATE";
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    visibility?: "PUBLIC" | "PRIVATE" | undefined;
}>;
export declare const updateServerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    visibility: z.ZodOptional<z.ZodEnum<["PUBLIC", "PRIVATE"]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | null | undefined;
    visibility?: "PUBLIC" | "PRIVATE" | undefined;
}, {
    name?: string | undefined;
    description?: string | null | undefined;
    visibility?: "PUBLIC" | "PRIVATE" | undefined;
}>;
export declare const createInviteSchema: z.ZodObject<{
    maxUses: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    expiresInHours: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    maxUses?: number | null | undefined;
    expiresInHours?: number | null | undefined;
}, {
    maxUses?: number | null | undefined;
    expiresInHours?: number | null | undefined;
}>;
export declare const updateNicknameSchema: z.ZodObject<{
    nickname: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    nickname?: string | null | undefined;
}, {
    nickname?: string | null | undefined;
}>;
export declare const transferOwnershipSchema: z.ZodObject<{
    newOwnerId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newOwnerId: string;
}, {
    newOwnerId: string;
}>;
export type CreateServerDto = z.infer<typeof createServerSchema>;
export type UpdateServerDto = z.infer<typeof updateServerSchema>;
export type CreateInviteDto = z.infer<typeof createInviteSchema>;
export type UpdateNicknameDto = z.infer<typeof updateNicknameSchema>;
export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;
export interface ServerResponse {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    iconUrl: string | null;
    bannerUrl: string | null;
    ownerId: string;
    visibility: "PUBLIC" | "PRIVATE";
    memberCount: number;
    createdAt: string;
}
export interface MemberResponse {
    id: string;
    userId: string;
    serverId: string;
    nickname: string | null;
    role: "OWNER" | "ADMIN" | "MODERATOR" | "MEMBER";
    joinedAt: string;
    user: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
    };
}
export interface InviteResponse {
    id: string;
    code: string;
    serverId: string;
    maxUses: number | null;
    uses: number;
    expiresAt: string | null;
    createdAt: string;
    server: {
        id: string;
        name: string;
        iconUrl: string | null;
        memberCount: number;
    };
}
