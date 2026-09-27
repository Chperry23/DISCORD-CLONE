import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { StorageService } from "../storage/storage.service";
import type { PresignAttachmentDto } from "@discord-clone/shared";
import { Response } from "express";

@Injectable()
export class AttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  private apiBasePath(): string {
    const prefix = this.config.get<string>("API_GLOBAL_PREFIX") ?? "api";
    return `/${prefix}`;
  }

  async presignUpload(channelId: string, userId: string, dto: PresignAttachmentDto) {
    if (!this.storage.isConfigured()) {
      throw new ServiceUnavailableException("Object storage is not configured");
    }

    await this.authz.assertChannelReadable(channelId, userId);

    const storageKey = this.storage.newStorageKey(channelId, dto.filename);
    const { uploadUrl, expiresIn } = await this.storage.createPresignedUpload(
      storageKey,
      dto.mimeType,
      dto.sizeBytes,
    );

    const attachment = await this.prisma.messageAttachment.create({
      data: {
        channelId,
        uploaderId: userId,
        storageKey,
        filename: dto.filename,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        status: "PENDING",
      },
    });

    return {
      attachmentId: attachment.id,
      uploadUrl,
      expiresIn,
      method: "PUT" as const,
    };
  }

  async bindAttachmentsToMessage(messageId: string, channelId: string, userId: string, ids: string[]) {
    if (ids.length === 0) return;

    const attachments = await this.prisma.messageAttachment.findMany({
      where: { id: { in: ids }, channelId, uploaderId: userId, status: "PENDING" },
    });

    if (attachments.length !== ids.length) {
      throw new BadRequestException("Invalid or already used attachment ids");
    }

    await this.prisma.messageAttachment.updateMany({
      where: { id: { in: ids } },
      data: { messageId, status: "ATTACHED" },
    });
  }

  async streamContent(attachmentId: string, userId: string, res: Response) {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: true },
    });
    if (!attachment || attachment.status !== "ATTACHED" || !attachment.messageId) {
      throw new NotFoundException("Attachment not found");
    }

    await this.authz.assertChannelReadable(attachment.channelId, userId);

    const { body, contentType, contentLength } = await this.storage.getObjectStream(
      attachment.storageKey,
    );

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${attachment.filename}"`);
    if (contentLength) res.setHeader("Content-Length", String(contentLength));
    res.setHeader("Cache-Control", "private, max-age=3600");

    const stream = body as NodeJS.ReadableStream;
    stream.pipe(res);
  }
}
