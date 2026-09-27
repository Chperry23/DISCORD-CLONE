import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { userSearchQuerySchema } from "@discord-clone/shared";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get("search")
  search(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(userSearchQuerySchema)) query: { q: string },
  ) {
    return this.users.search(userId, query.q);
  }
}
