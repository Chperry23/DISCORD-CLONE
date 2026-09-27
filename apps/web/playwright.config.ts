import { defineConfig, devices } from "@playwright/test";

const webPort = 3000;
const apiPort = 4000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @discord-clone/api exec prisma migrate deploy && node dist/main.js",
      url: `http://127.0.0.1:${apiPort}/api/health`,
      cwd: "../..",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        PORT: String(apiPort),
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        REDIS_URL: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
        JWT_SECRET: process.env.JWT_SECRET ?? "e2e-jwt-secret-at-least-32-characters-long",
        JWT_REFRESH_SECRET:
          process.env.JWT_REFRESH_SECRET ?? "e2e-refresh-secret-at-least-32-chars",
        JWT_ACCESS_EXPIRES_IN: "15m",
        JWT_REFRESH_EXPIRES_IN: "7d",
        FRONTEND_URL: `http://127.0.0.1:${webPort}`,
        NODE_ENV: "test",
      },
    },
    {
      command: "pnpm --filter @discord-clone/web start",
      url: `http://127.0.0.1:${webPort}`,
      cwd: "../..",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}/api`,
        NEXT_PUBLIC_SOCKET_URL: `http://127.0.0.1:${apiPort}`,
      },
    },
  ],
});
