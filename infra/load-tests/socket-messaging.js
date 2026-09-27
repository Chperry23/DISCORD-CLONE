/**
 * k6 load stub: Socket.IO connect + channel message send.
 *
 * Prerequisites:
 *   - API running with Redis (multi-instance adapter) and Postgres migrated
 *   - k6 installed: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Environment:
 *   BASE_URL     API origin (default http://localhost:4000)
 *   AUTH_TOKEN   JWT access token for a test user (required)
 *   CHANNEL_ID   Text channel UUID to join/send (required)
 *
 * Run:
 *   AUTH_TOKEN=eyJ... CHANNEL_ID=... k6 run infra/load-tests/socket-messaging.js
 *
 * Smoke (few VUs):
 *   k6 run --vus 5 --duration 30s infra/load-tests/socket-messaging.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import ws from "k6/ws";
import { Counter } from "k6/metrics";

const messagesSent = new Counter("socket_messages_sent");

const baseUrl = __ENV.BASE_URL || "http://localhost:4000";
const authToken = __ENV.AUTH_TOKEN;
const channelId = __ENV.CHANNEL_ID;

export const options = {
  scenarios: {
    socket_smoke: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 10 },
        { duration: "20s", target: 10 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    checks: ["rate>0.9"],
  },
};

export function setup() {
  if (!authToken || !channelId) {
    throw new Error("Set AUTH_TOKEN and CHANNEL_ID environment variables before running.");
  }
  const health = http.get(`${baseUrl}/api/health`);
  check(health, { "api health ok": (r) => r.status === 200 });
  return { authToken, channelId };
}

export default function (data) {
  const socketUrl = `${baseUrl.replace(/^http/, "ws")}/socket.io/?EIO=4&transport=websocket`;
  const namespace = "/chat";

  ws.connect(`${socketUrl}`, { tags: { name: "socket.io" } }, (socket) => {
    socket.on("open", () => {
      socket.send(`40${namespace},`);
    });

    socket.on("message", (msg) => {
      if (typeof msg !== "string") return;
      if (msg.startsWith("0")) {
        // Engine.IO open — auth payload for namespace connect
        socket.send(`40${namespace},{"token":"${data.authToken}"}`);
      }
      if (msg.startsWith(`40${namespace}`)) {
        socket.send(
          `42${namespace},["channel:join",${JSON.stringify({ channelId: data.channelId })}]`,
        );
        const payload = {
          channelId: data.channelId,
          content: `k6 ping ${__VU}-${__ITER}`,
        };
        socket.send(`42${namespace},["message:send",${JSON.stringify(payload)}]`);
        messagesSent.add(1);
      }
    });

    sleep(1);
    socket.close();
  });

  sleep(0.5);
}
