import { z } from "zod";

export const ALLOWED_ATTACHMENT_MIME_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "text/plain",
] as const;

export const presignAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.number().int().positive().max(8 * 1024 * 1024, "File too large (max 8MB)"),
});

export type PresignAttachmentDto = z.infer<typeof presignAttachmentSchema>;

export interface AttachmentResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  /** First-party download path (no third-party URLs). */
  downloadUrl: string;
}
