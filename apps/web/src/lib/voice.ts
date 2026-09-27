import type { IceServersResponse } from "@discord-clone/shared";
import { api } from "./api";

export async function fetchVoiceIceConfig(): Promise<IceServersResponse> {
  return api.get<IceServersResponse>("/voice/ice-servers");
}
