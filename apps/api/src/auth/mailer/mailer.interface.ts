export interface PasswordResetMailPayload {
  email: string;
  resetUrl: string;
}

export interface Mailer {
  sendPasswordReset(payload: PasswordResetMailPayload): Promise<void>;
}

export const MAILER = Symbol("MAILER");
