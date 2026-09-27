import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { PrivacyService } from "./privacy.service";
import { deleteAccountSchema, type DeleteAccountDto } from "@discord-clone/shared";

@Controller("users/me/privacy")
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Post("export")
  @Throttle({ long: { limit: 3, ttl: 60000 } })
  requestExport(@CurrentUser("id") userId: string) {
    return this.privacy.requestExport(userId);
  }

  @Get("exports")
  listExports(@CurrentUser("id") userId: string) {
    return this.privacy.listExports(userId);
  }

  @Get("export/:token")
  downloadExport(@CurrentUser("id") userId: string, @Param("token") token: string) {
    return this.privacy.getExportByToken(userId, token);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Throttle({ long: { limit: 2, ttl: 60000 } })
  async deleteAccount(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(deleteAccountSchema)) dto: DeleteAccountDto,
  ) {
    await this.privacy.deleteAccount(userId, dto);
    return { message: "Account deleted" };
  }
}
