import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VoiceConfigService } from "./voice-config.service";

@Controller("voice")
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceConfig: VoiceConfigService) {}

  /** ICE/TURN config for the web client (authenticated; no secrets beyond TURN creds). */
  @Get("ice-servers")
  getIceServers() {
    return this.voiceConfig.getIceServersConfig();
  }
}
