import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { StripeWebhookService } from "./stripe-webhook.service";
import { StripeSignatureError } from "./stripe-signature.util";

@Controller("billing")
@SkipThrottle()
export class StripeWebhookController {
  constructor(private readonly webhooks: StripeWebhookService) {}

  @Post("webhook")
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw) {
      throw new BadRequestException("Missing raw body for webhook verification");
    }

    try {
      return await this.webhooks.handleRawWebhook(raw, signature);
    } catch (err) {
      if (err instanceof StripeSignatureError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
