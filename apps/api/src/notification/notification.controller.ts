import { Controller, Get, Patch, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { NotificationService } from "./notification.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  list(@CurrentUser("id") userId: string) {
    return this.notifications.listForUser(userId);
  }

  @Patch(":notificationId/read")
  markRead(@Param("notificationId") notificationId: string, @CurrentUser("id") userId: string) {
    return this.notifications.markRead(notificationId, userId);
  }

  @Post("read-all")
  markAllRead(@CurrentUser("id") userId: string) {
    return this.notifications.markAllRead(userId);
  }
}
