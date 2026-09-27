import { canRelayRtcSignaling, isVoiceParticipant } from "./voice-session.helpers";

function mapWith(channelId: string, userIds: string[]) {
  const inner = new Map(userIds.map((id) => [id, {}]));
  return new Map([[channelId, inner]]);
}

describe("voice session helpers", () => {
  it("detects voice participants", () => {
    const m = mapWith("ch1", ["u1", "u2"]);
    expect(isVoiceParticipant(m, "ch1", "u1")).toBe(true);
    expect(isVoiceParticipant(m, "ch1", "u3")).toBe(false);
  });

  it("allows rtc relay only when both users are in channel", () => {
    const m = mapWith("ch1", ["u1", "u2"]);
    expect(canRelayRtcSignaling(m, "ch1", "u1", "u2")).toBe(true);
    expect(canRelayRtcSignaling(m, "ch1", "u1", "u3")).toBe(false);
  });
});
