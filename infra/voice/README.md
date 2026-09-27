# Voice topology (Phase 3)

## Current default: full mesh (P2P)

The web client uses **mesh WebRTC**: each participant opens a peer connection to every other participant in the voice channel. Signaling runs over Socket.IO (`rtc:*` events on `/chat`).

| Participants | Typical use | Notes |
|--------------|-------------|--------|
| ≤ 8 | Dev + small groups | Default `VOICE_MESH_MAX_PARTICIPANTS=8` |
| 9+ | Not recommended on mesh | CPU/bandwidth scale O(n²); move to SFU |

**Privacy:** In mesh mode, media flows **directly between browsers** when NAT allows. When NAT/firewalls block direct paths, **TURN relay** carries encrypted SRTP; the TURN server sees relay metadata (IPs, ports, timing) but not decrypted audio.

## Dev: coturn (self-hosted STUN + TURN)

Start with Docker Compose (see root README):

```bash
docker compose -f infra/docker/docker-compose.yml up -d coturn
```

Default credentials (override in `.env`):

- STUN: `stun:localhost:3478`
- TURN: `turn:localhost:3478` with `ICE_TURN_USERNAME` / `ICE_TURN_CREDENTIAL`

Clients fetch ICE config from `GET /api/voice/ice-servers` (authenticated).

## Production: TURN relay

For production, run **coturn** (or managed TURN) with:

- TLS on 5349 (`turns:` URLs)
- Short-lived credentials (coturn `use-auth-secret` + REST API) — not yet wired; static creds OK for staging only
- Restrict relay IP ranges and monitor bandwidth

Set `ICE_STUN_URLS`, `ICE_TURN_URLS`, and TURN credentials via secrets manager — not committed to git.

## Future: SFU (Livekit / mediasoup)

When `VOICE_TOPOLOGY=sfu`, the API reports `mode: "sfu"` in the ICE config response. **SFU media plane is not implemented in this repo yet**; this flag documents the migration path.

Recommended production path:

1. **Livekit** — fastest ops path: deploy Livekit server, issue room tokens from NestJS, replace mesh `WebRTCManager` with `@livekit/components-react` or livekit-client.
2. **mediasoup** — self-hosted SFU; run `mediasoup-demo` or custom worker; NestJS issues router capabilities + transports.

Stub env (no runtime effect until SFU client lands):

```env
VOICE_TOPOLOGY=sfu
# LIVEKIT_URL=wss://livekit.example.com
# LIVEKIT_API_KEY=
# LIVEKIT_API_SECRET=
```

See [Livekit docs](https://docs.livekit.io/) and [mediasoup](https://mediasoup.org/) for deployment guides.
