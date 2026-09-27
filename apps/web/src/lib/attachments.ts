import { api } from "./api";
import type { PresignAttachmentDto } from "@discord-clone/shared";

export async function presignAttachment(channelId: string, dto: PresignAttachmentDto) {
  return api.post<{ attachmentId: string; uploadUrl: string; expiresIn: number; method: "PUT" }>(
    `/channels/${channelId}/attachments/presign`,
    dto,
  );
}

export async function uploadAttachmentFile(
  channelId: string,
  file: File,
): Promise<string> {
  const presign = await presignAttachment(channelId, {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  const res = await fetch(presign.uploadUrl, {
    method: presign.method,
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return presign.attachmentId;
}
