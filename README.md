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
  /docker     → Docker Compose for Postgres + Redis
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

## Environment Variables

See `.env.example` for all required variables.

## License

Private — All rights reserved.
