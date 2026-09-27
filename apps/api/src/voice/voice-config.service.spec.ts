import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VoiceConfigService } from "./voice-config.service";

describe("VoiceConfigService", () => {
  let service: VoiceConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const env: Record<string, string> = {
                ICE_STUN_URLS: "stun:localhost:3478",
                ICE_TURN_URLS: "turn:localhost:3478?transport=udp",
                ICE_TURN_USERNAME: "discord",
                ICE_TURN_CREDENTIAL: "secret",
              };
              return env[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(VoiceConfigService);
  });

  it("returns STUN and TURN from env", () => {
    const config = service.getIceServersConfig();
    expect(config.mode).toBe("mesh");
    expect(config.meshRecommendedMax).toBe(8);
    expect(config.iceServers.length).toBeGreaterThanOrEqual(2);
    expect(config.iceServers.some((s) => String(s.urls).includes("turn:"))).toBe(true);
  });
});
