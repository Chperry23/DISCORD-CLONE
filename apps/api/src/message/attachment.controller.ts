import { Controller, Get, Param, Post, Body, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { presignAttachmentSchema } from "@discord-clone/shared";
import type { PresignAttachmentDto } from "@discord-clone/shared";
import { AttachmentService } from "./attachment.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class AttachmentController {
  constructor(private readonly attachments: AttachmentService) {}

  @Post("channels/:channelId/attachments/presign")
  presign(
    @Param("channelId") channelId: string,
    @Body(new ZodValidationPipe(presignAttachmentSchema)) dto: PresignAttachmentDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.attachments.presignUpload(channelId, userId, dto);
  }

  @Get("attachments/:attachmentId/content")
  async content(
    @Param("attachmentId") attachmentId: string,
    @CurrentUser("id") userId: string,
    @Res() res: Response,
  ) {
    await this.attachments.streamContent(attachmentId, userId, res);
  }
}
