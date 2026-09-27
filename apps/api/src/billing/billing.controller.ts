import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { serverBoostCheckoutSchema } from "@discord-clone/shared";
import type { ServerBoostCheckoutDto } from "@discord-clone/shared";
import { BillingService } from "./billing.service";
import { EntitlementService } from "./entitlement.service";

@Controller("billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get("entitlements/me")
  getMine(@CurrentUser("id") userId: string) {
    return this.billing.getMyEntitlements(userId);
  }

  @Get("entitlements/server/:serverId")
  async getServerBoost(@Param("serverId") serverId: string) {
    const boostActive = await this.entitlements.hasActiveServerBoost(serverId);
    return { serverId, boostActive };
  }

  @Post("checkout/server-boost")
  checkoutBoost(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(serverBoostCheckoutSchema)) dto: ServerBoostCheckoutDto,
  ) {
    return this.billing.createServerBoostCheckout(userId, dto);
  }

  @Post("checkout/profile-badge")
  checkoutBadge(@CurrentUser("id") userId: string) {
    return this.billing.createProfileBadgeCheckout(userId);
  }
}
