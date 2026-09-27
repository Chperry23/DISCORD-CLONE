import { Injectable, Logger } from "@nestjs/common";
import type { Mailer, PasswordResetMailPayload } from "./mailer.interface";

/** Production default when no SMTP is configured — does not log secrets. */
@Injectable()
export class NoopMailer implements Mailer {
  private readonly logger = new Logger(NoopMailer.name);

  async sendPasswordReset(payload: PasswordResetMailPayload): Promise<void> {
    this.logger.log(`Password reset requested for ${payload.email} (delivery not configured)`);
  }
}
