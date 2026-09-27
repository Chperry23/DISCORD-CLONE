import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { FriendsService } from "./friends.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { sendFriendRequestSchema } from "@discord-clone/shared";
import type { SendFriendRequestDto } from "@discord-clone/shared";

@Controller("friends")
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  list(@CurrentUser("id") userId: string) {
    return this.friends.list(userId);
  }

  @Post("requests")
  sendRequest(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(sendFriendRequestSchema)) dto: SendFriendRequestDto,
  ) {
    return this.friends.sendRequest(userId, dto.targetUserId);
  }

  @Post("requests/:id/accept")
  accept(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.friends.accept(userId, id);
  }

  @Delete(":id")
  remove(@CurrentUser("id") userId: string, @Param("id") id: string) {
    return this.friends.remove(userId, id);
  }

  @Post("block")
  block(
    @CurrentUser("id") userId: string,
    @Body(new ZodValidationPipe(sendFriendRequestSchema)) dto: SendFriendRequestDto,
  ) {
    return this.friends.block(userId, dto.targetUserId);
  }

  @Delete("block/:targetUserId")
  unblock(@CurrentUser("id") userId: string, @Param("targetUserId") targetUserId: string) {
    return this.friends.unblock(userId, targetUserId);
  }
}
