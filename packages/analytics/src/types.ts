export interface TrackedEvent {
  id: string;
  userId: string | null;
  serverId: string | null;
  name: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

export interface AnalyticsTransport {
  send(event: TrackedEvent): Promise<void>;
  flush?(): Promise<void>;
}

export interface AnalyticsConfig {
  transports: AnalyticsTransport[];
  /** Buffer size before auto-flush. Default 50 */
  bufferSize?: number;
  /** Flush interval in ms. Default 5000 */
  flushIntervalMs?: number;
  /** Global properties appended to every event */
  globalProperties?: Record<string, unknown>;
}
