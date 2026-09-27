import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { AuthzModule } from "../authz/authz.module";

@Module({
  imports: [AuthzModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
