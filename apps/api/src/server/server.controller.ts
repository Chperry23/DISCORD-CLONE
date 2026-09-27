import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ServerService } from "./server.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  createServerSchema,
  updateServerSchema,
  transferOwnershipSchema,
} from "@discord-clone/shared";
import type {
  CreateServerDto,
  UpdateServerDto,
  TransferOwnershipDto,
} from "@discord-clone/shared";

@Controller("servers")
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createServerSchema)) dto: CreateServerDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.serverService.create(dto, userId);
  }

  @Get("mine")
  async listMine(@CurrentUser("id") userId: string) {
    return this.serverService.listForUser(userId);
  }

  @Get("discover")
  async discover(@Query("cursor") cursor?: string, @Query("take") take?: string) {
    return this.serverService.listPublic(cursor, take ? parseInt(take, 10) : 20);
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser("id") userId: string) {
    return this.serverService.findById(id, userId);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateServerSchema)) dto: UpdateServerDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.serverService.update(id, dto, userId);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser("id") userId: string) {
    await this.serverService.delete(id, userId);
    return { message: "Server deleted" };
  }

  @Post(":id/transfer")
  async transferOwnership(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(transferOwnershipSchema)) dto: TransferOwnershipDto,
    @CurrentUser("id") userId: string,
  ) {
    await this.serverService.transferOwnership(id, userId, dto.newOwnerId);
    return { message: "Ownership transferred" };
  }
}
