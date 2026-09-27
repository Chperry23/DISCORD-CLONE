# Load tests (k6)

Stub scripts for exercising realtime paths under load. Not wired to CI by default (optional `load-test` workflow).

## Prerequisites

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) on your PATH
- Running API + Postgres + Redis (`docker compose -f infra/docker/docker-compose.yml up -d`)
- A user JWT and a text channel id (create via UI or API)

## Socket connect + message

```bash
export BASE_URL=http://localhost:4000
export AUTH_TOKEN="<access token from login>"
export CHANNEL_ID="<text channel uuid>"

k6 run infra/load-tests/socket-messaging.js
```

Smoke profile (10 VUs):

```bash
k6 run --vus 10 --duration 30s infra/load-tests/socket-messaging.js
```

For multi-instance validation, run two API processes on different ports behind a load balancer; all instances must share `REDIS_URL` so Socket.IO rooms stay in sync.
