import { Injectable, Logger } from "@nestjs/common";
import type { Mailer, PasswordResetMailPayload } from "./mailer.interface";

/** Dev/test mailer — logs reset URL only (never raw token alone in prod paths). */
@Injectable()
export class DevSinkMailer implements Mailer {
  private readonly logger = new Logger(DevSinkMailer.name);

  async sendPasswordReset(payload: PasswordResetMailPayload): Promise<void> {
    this.logger.log(`[dev-mail] password reset for ${payload.email}: ${payload.resetUrl}`);
  }
}
