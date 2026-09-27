import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  buildIceServersFromEnv,
  voiceTopologyFromEnv,
  type IceServersResponse,
} from "@discord-clone/shared";

@Injectable()
export class VoiceConfigService {
  constructor(private readonly config: ConfigService) {}

  getIceServersConfig(): IceServersResponse {
    const env: Record<string, string | undefined> = {
      ICE_SERVERS_JSON: this.config.get<string>("ICE_SERVERS_JSON"),
      ICE_STUN_URLS: this.config.get<string>("ICE_STUN_URLS"),
      ICE_TURN_URLS: this.config.get<string>("ICE_TURN_URLS"),
      ICE_TURN_USERNAME: this.config.get<string>("ICE_TURN_USERNAME"),
      ICE_TURN_CREDENTIAL: this.config.get<string>("ICE_TURN_CREDENTIAL"),
      VOICE_TOPOLOGY: this.config.get<string>("VOICE_TOPOLOGY"),
      VOICE_MESH_MAX_PARTICIPANTS: this.config.get<string>("VOICE_MESH_MAX_PARTICIPANTS"),
    };
    const { mode, meshRecommendedMax } = voiceTopologyFromEnv(env);
    const iceServers = buildIceServersFromEnv(env);

    return { iceServers, meshRecommendedMax, mode };
  }
}
