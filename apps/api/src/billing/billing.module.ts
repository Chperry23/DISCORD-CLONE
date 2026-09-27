import { Module } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { BillingController } from "./billing.controller";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeWebhookService } from "./stripe-webhook.service";
import { EntitlementService } from "./entitlement.service";
import { AuthzModule } from "../authz/authz.module";

@Module({
  imports: [AuthzModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, StripeWebhookService, EntitlementService],
  exports: [EntitlementService, BillingService],
})
export class BillingModule {}
