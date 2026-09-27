import { z } from "zod";

/** WebRTC ICE server entry (RTCIceServer-compatible). */
export const iceServerSchema = z.object({
  urls: z.union([z.string(), z.array(z.string())]),
  username: z.string().optional(),
  credential: z.string().optional(),
});

export type IceServerConfig = z.infer<typeof iceServerSchema>;

export const iceServersResponseSchema = z.object({
  iceServers: z.array(iceServerSchema),
  /** Mesh full-mesh is practical up to this many participants (signaling only). */
  meshRecommendedMax: z.number().int().positive(),
  mode: z.enum(["mesh", "sfu"]),
});

export type IceServersResponse = z.infer<typeof iceServersResponseSchema>;

const DEFAULT_DEV_STUN = "stun:localhost:3478";

function splitCsv(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build ICE servers from environment.
 * Prefer self-hosted STUN/TURN (coturn). Optional ICE_SERVERS_JSON overrides all.
 */
export function buildIceServersFromEnv(env: Record<string, string | undefined>): IceServerConfig[] {
  const rawJson = env["ICE_SERVERS_JSON"];
  if (rawJson?.trim()) {
    const parsed = JSON.parse(rawJson) as unknown;
    const list = z.array(iceServerSchema).parse(parsed);
    return list;
  }

  const servers: IceServerConfig[] = [];

  const stunUrls = splitCsv(env["ICE_STUN_URLS"]);
  for (const url of stunUrls.length > 0 ? stunUrls : [DEFAULT_DEV_STUN]) {
    servers.push({ urls: url });
  }

  const turnUrls = splitCsv(env["ICE_TURN_URLS"]);
  const turnUser = env["ICE_TURN_USERNAME"];
  const turnCred = env["ICE_TURN_CREDENTIAL"];

  if (turnUrls.length > 0 && turnUser && turnCred) {
    for (const url of turnUrls) {
      servers.push({ urls: url, username: turnUser, credential: turnCred });
    }
  }

  return servers;
}

export function voiceTopologyFromEnv(env: Record<string, string | undefined>): {
  mode: "mesh" | "sfu";
  meshRecommendedMax: number;
} {
  const mode = env["VOICE_TOPOLOGY"] === "sfu" ? "sfu" : "mesh";
  const maxRaw = env["VOICE_MESH_MAX_PARTICIPANTS"];
  const meshRecommendedMax = maxRaw ? Math.max(2, parseInt(maxRaw, 10) || 8) : 8;
  return { mode, meshRecommendedMax };
}
