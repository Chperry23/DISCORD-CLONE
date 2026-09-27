import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, PrivacyController],
  providers: [UsersService, PrivacyService],
})
export class UsersModule {}
