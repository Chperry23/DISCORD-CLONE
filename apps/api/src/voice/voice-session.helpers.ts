/** Returns true if userId is connected to the in-memory voice channel map. */
export function isVoiceParticipant(
  voiceChannels: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
  channelId: string,
  userId: string,
): boolean {
  return voiceChannels.get(channelId)?.has(userId) ?? false;
}

/** Both peers must be in the same voice channel to relay WebRTC signaling. */
export function canRelayRtcSignaling(
  voiceChannels: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
  channelId: string,
  fromUserId: string,
  targetUserId: string,
): boolean {
  const channel = voiceChannels.get(channelId);
  if (!channel) return false;
  return channel.has(fromUserId) && channel.has(targetUserId);
}
