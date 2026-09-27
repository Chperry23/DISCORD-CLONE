import { Module } from "@nestjs/common";
import { VoiceController } from "./voice.controller";
import { VoiceConfigService } from "./voice-config.service";

@Module({
  controllers: [VoiceController],
  providers: [VoiceConfigService],
  exports: [VoiceConfigService],
})
export class VoiceModule {}
