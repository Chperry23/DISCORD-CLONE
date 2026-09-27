import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { SearchService } from "./search.service";
import { messageSearchQuerySchema, type MessageSearchQuery } from "@discord-clone/shared";

@Controller("search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("messages")
  messages(
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(messageSearchQuerySchema)) query: MessageSearchQuery,
  ) {
    return this.search.searchMessages(userId, query);
  }
}
