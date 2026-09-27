# NEXUS — Discord Clone

A scalable, privacy-first, real-time communication platform built for gamers.

## Tech Stack

| Layer     | Technology                              |
|-----------|----------------------------------------|
| Frontend  | Next.js 15, React 19, Tailwind, TanStack Query |
| Backend   | NestJS, Prisma, PostgreSQL, Redis, Socket.IO |
| Monorepo  | pnpm workspaces + Turborepo            |
| Auth      | JWT (access + refresh tokens), Argon2  |
| Analytics | Custom event SDK with buffered writes  |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

This starts **PostgreSQL**, **Redis**, **MinIO** (attachments), and **coturn** (self-hosted STUN/TURN for voice). Voice defaults are in [`.env.example`](.env.example).

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Database

Ensure `DATABASE_URL` in `.env` matches [`.env.example`](.env.example) (PostgreSQL via Docker Compose).

```bash
pnpm db:migrate   # applies Prisma migrations to Postgres
pnpm db:seed
```

For local `pnpm db:migrate`, the DB user needs permission to create a Prisma shadow database (Docker `discord` user is configured in compose; for custom Postgres, grant `CREATEDB`).

### 4. Run Dev

```bash
pnpm dev
```

- **API**: http://localhost:4000/api
- **Web**: http://localhost:3000
- **Health**: http://localhost:4000/api/health

## Project Structure

```
/apps
  /web        → Next.js frontend (port 3000)
  /api        → NestJS backend  (port 4000)
/packages
  /shared     → Types, DTOs, Zod schemas
  /analytics  → Event tracking SDK
/infra
  /docker     → Docker Compose (Postgres, Redis, MinIO, coturn)
  /voice      → Mesh vs SFU notes, production TURN guidance
```

## Voice & WebRTC (Phase 3)

| Mode | When | Media path |
|------|------|------------|
| **Mesh (default)** | ≤ 8 users per voice channel | Browser ↔ browser (P2P); TURN relay when NAT blocks direct paths |
| **SFU (planned)** | Larger channels | Set `VOICE_TOPOLOGY=sfu` — see [`infra/voice/README.md`](infra/voice/README.md) for Livekit/mediasoup migration |

- **Authorization:** `voice:join` requires server membership + voice channel type (`assertVoiceJoin`). `voice:get` requires channel read access. WebRTC signaling is relayed only between users already in the same voice session.
- **ICE config:** Authenticated clients call `GET /api/voice/ice-servers`. Configure `ICE_STUN_URLS`, `ICE_TURN_URLS`, and TURN credentials — **prefer self-hosted coturn** over public STUN (Google STUN removed from the web client).
- **Privacy:** Mesh keeps audio off the app server; TURN sees relay metadata only. For strict egress policies, run coturn in your VPC and avoid third-party STUN.

```bash
# Dev TURN (matches coturn/turnserver.conf)
ICE_STUN_URLS=stun:localhost:3478
ICE_TURN_URLS=turn:localhost:3478?transport=udp
ICE_TURN_USERNAME=discord
ICE_TURN_CREDENTIAL=discord_turn_dev
```

## API Endpoints (Phase 1)

| Method | Path                          | Auth  | Description            |
|--------|-------------------------------|-------|------------------------|
| POST   | /api/auth/register            | No    | Create account         |
| POST   | /api/auth/login               | No    | Login                  |
| POST   | /api/auth/refresh             | No    | Refresh access token   |
| POST   | /api/auth/logout              | Yes   | Logout (revoke session)|
| POST   | /api/auth/logout-all          | Yes   | Revoke all sessions    |
| POST   | /api/auth/password-reset/request  | No | Request reset email  |
| POST   | /api/auth/password-reset/confirm  | No | Reset password       |
| GET    | /api/auth/me                  | Yes   | Get current user       |
| GET    | /api/health                   | No    | Health check           |

## API Endpoints (Phase 2 — Servers)

| Method | Path                                    | Auth | Description            |
|--------|-----------------------------------------|------|------------------------|
| POST   | /api/servers                            | Yes  | Create server          |
| GET    | /api/servers/mine                       | Yes  | List my servers        |
| GET    | /api/servers/discover                   | Yes  | Browse public servers  |
| GET    | /api/servers/:id                        | Yes  | Get server details     |
| PATCH  | /api/servers/:id                        | Yes  | Update server          |
| DELETE | /api/servers/:id                        | Yes  | Delete server (owner)  |
| POST   | /api/servers/:id/transfer               | Yes  | Transfer ownership     |
| GET    | /api/servers/:id/members                | Yes  | List members           |
| GET    | /api/servers/:id/members/me             | Yes  | My membership          |
| POST   | /api/servers/:id/members/join           | Yes  | Join server (public)   |
| POST   | /api/servers/:id/members/leave          | Yes  | Leave server           |
| PATCH  | /api/servers/:id/members/me/nickname    | Yes  | Update nickname        |
| DELETE | /api/servers/:id/members/:userId        | Yes  | Kick member            |
| POST   | /api/servers/:id/invites                | Yes  | Create invite          |
| GET    | /api/servers/:id/invites                | Yes  | List invites (admin)   |
| DELETE | /api/servers/:id/invites/:inviteId      | Yes  | Revoke invite          |
| GET    | /api/invites/:code                      | Yes  | Preview invite         |
| POST   | /api/invites/:code/use                  | Yes  | Use invite to join     |

## Seed Data

| Username      | Email                      | Password    | Admin |
|---------------|----------------------------|-------------|-------|
| admin         | admin@discord-clone.dev    | Password123 | Yes   |
| gamer42       | gamer@discord-clone.dev    | Password123 | No    |
| streamer_pro  | streamer@discord-clone.dev | Password123 | No    |

| Server     | Owner  | Visibility | Invite Code |
|------------|--------|------------|-------------|
| Nexus HQ   | admin  | Public     | NEXUS001    |
| Dev Lounge | gamer42| Private    | —           |

## Analytics Events

### Phase 1 — Auth
- `user_registered` — new account created
- `user_logged_in` — successful login
- `login_failed` — failed login attempt

### Phase 2 — Servers
- `server_created` — new server created
- `member_joined` — user joined a server
- `member_left` — user left a server
- `invite_created` — invite link generated
- `invite_used` — invite code redeemed
- `ownership_transferred` — server ownership changed

## Running Tests

```bash
pnpm test
```

### E2E (Playwright)

Requires Postgres, Redis, and built API/web (Playwright starts both when you run the suite):

```bash
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
pnpm --filter @discord-clone/api exec prisma migrate deploy
pnpm --filter @discord-clone/api build
pnpm --filter @discord-clone/web build
pnpm test:e2e
```

CI runs the same flow in [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml).

### Load testing (k6)

Optional socket connect/message stub — see [`infra/load-tests/README.md`](infra/load-tests/README.md). Manual workflow: [`.github/workflows/load-test.yml`](.github/workflows/load-test.yml) (requires repo secrets).

## Multi-instance API (Socket.IO)

All API replicas must share `REDIS_URL`. On boot, the API attaches `@socket.io/redis-adapter` so channel/DM/presence rooms fan out across instances. Set `SOCKET_REDIS_ADAPTER=false` only for single-node dev without Redis.

## PWA (installable web)

Production builds register a service worker and ship `manifest.webmanifest` (install prompt, standalone display, offline fallback page at `/offline`). Icons live under `apps/web/public/icons/`.

## Environment Variables

See `.env.example` for all required variables (including voice / ICE).

| Variable | Purpose |
|----------|---------|
| `ICE_STUN_URLS` | Comma-separated STUN URIs (default local coturn) |
| `ICE_TURN_URLS` | Comma-separated TURN URIs (production relay) |
| `ICE_TURN_USERNAME` / `ICE_TURN_CREDENTIAL` | TURN long-term credentials |
| `ICE_SERVERS_JSON` | Optional full JSON override for ICE servers |
| `VOICE_TOPOLOGY` | `mesh` (default) or `sfu` (future) |
| `VOICE_MESH_MAX_PARTICIPANTS` | Recommended mesh limit (default 8) |

## License

Private — All rights reserved.
