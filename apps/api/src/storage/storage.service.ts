import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ALLOWED_ATTACHMENT_MIME_PREFIXES } from "@discord-clone/shared";
import { randomUUID } from "crypto";

@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly maxBytes: number;
  private bucketReady: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {
    const endpoint = config.get<string>("S3_ENDPOINT");
    const accessKey = config.get<string>("S3_ACCESS_KEY");
    const secretKey = config.get<string>("S3_SECRET_KEY");
    this.bucket = config.get<string>("S3_BUCKET") ?? "discord-clone-uploads";
    this.maxBytes = config.get<number>("ATTACHMENT_MAX_BYTES") ?? 8 * 1024 * 1024;

    if (endpoint && accessKey && secretKey) {
      this.client = new S3Client({
        endpoint,
        region: config.get<string>("S3_REGION") ?? "us-east-1",
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: config.get<string>("S3_FORCE_PATH_STYLE") !== "false",
      });
    } else {
      this.client = null;
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  assertMimeAllowed(mimeType: string) {
    const ok = ALLOWED_ATTACHMENT_MIME_PREFIXES.some(
      (prefix) => mimeType === prefix || mimeType.startsWith(prefix),
    );
    if (!ok) {
      throw new BadRequestException("File type not allowed");
    }
  }

  assertSizeAllowed(sizeBytes: number) {
    if (sizeBytes > this.maxBytes) {
      throw new BadRequestException(`File too large (max ${this.maxBytes} bytes)`);
    }
  }

  private async ensureBucket() {
    if (!this.client) throw new ServiceUnavailableException("Object storage is not configured");
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        try {
          await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
        } catch {
          await this.client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
        }
      })();
    }
    await this.bucketReady;
  }

  newStorageKey(channelId: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
    return `channels/${channelId}/${randomUUID()}-${safe}`;
  }

  async createPresignedUpload(
    storageKey: string,
    mimeType: string,
    sizeBytes: number,
  ): Promise<{ uploadUrl: string; expiresIn: number }> {
    await this.ensureBucket();
    this.assertMimeAllowed(mimeType);
    this.assertSizeAllowed(sizeBytes);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    const expiresIn = 900;
    const uploadUrl = await getSignedUrl(this.client!, command, { expiresIn });
    return { uploadUrl, expiresIn };
  }

  async getObjectStream(storageKey: string) {
    await this.ensureBucket();
    const result = await this.client!.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
    );
    if (!result.Body) {
      throw new BadRequestException("Attachment not found in storage");
    }
    return {
      body: result.Body,
      contentType: result.ContentType ?? "application/octet-stream",
      contentLength: result.ContentLength,
    };
  }
}
