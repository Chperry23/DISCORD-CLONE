import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { SessionService } from "./session.service";
import { MAILER } from "./mailer/mailer.interface";
import { DevSinkMailer } from "./mailer/dev-sink.mailer";
import { NoopMailer } from "./mailer/noop.mailer";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: config.get<string>("JWT_ACCESS_EXPIRES_IN", "15m"),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    JwtStrategy,
    {
      provide: MAILER,
      useFactory: () => {
        const mode = process.env.PASSWORD_RESET_MAILER ?? "auto";
        if (mode === "dev-sink") return new DevSinkMailer();
        if (mode === "noop") return new NoopMailer();
        if (process.env.NODE_ENV === "production") return new NoopMailer();
        return new DevSinkMailer();
      },
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
