# Privacy & data handling

Nexus is built privacy-first: collect only what we need to operate chat, moderation, and compliance features.

## Personal data we store

| Category | Examples | Purpose |
|----------|----------|---------|
| Account | email, username, password hash, profile | Authentication and identity |
| Messages | channel and DM text you send | Real-time chat (not sold or used for ads) |
| Moderation | ban records, append-only audit events | Safety; audit metadata avoids message bodies except dedicated report flows |
| Technical | session metadata, optional IP on login | Security and abuse prevention |

## Message search

Server message search uses **PostgreSQL full-text search** on the API database. Queries are allowed only when you are a **member of the requested server** (optional channel filter must belong to that server). Search does not expose messages from servers you have not joined.

## GDPR-style export

Authenticated users can request a data export:

- `POST /api/users/me/privacy/export` — builds a JSON package (profile, memberships, messages you authored, friendships, analytics event count).
- `GET /api/users/me/privacy/export/:token` — download while the token is valid (24 hours).

Exports include your email for portability. Download tokens are single-use scoped secrets; treat them like passwords.

## Account deletion

`DELETE /api/users/me/privacy` with password confirmation permanently deletes the account when:

1. Password verifies successfully.
2. You do **not** own any servers (transfer or delete them first).

### Cascade behavior (high level)

Prisma `onDelete: Cascade` removes dependent rows tied to your user id, including:

- Sessions and password-reset tokens
- Channel messages, DMs, reactions, attachments metadata
- Memberships, friendships, notifications
- Moderation audit rows where you are actor or target (target set null where configured)
- Analytics events linked to your user id (user reference set null where configured)

Object storage blobs for attachments may require a separate lifecycle job in production; metadata deletion happens with the user/message cascade.

## Moderation audit log

`moderation_audit_events` is **append-only** via the API (no update/delete endpoints). Events store action types (`BAN`, `UNBAN`, `KICK`, `ROLE_CHANGE`, …) and small JSON metadata (roles, reason-present flags). **Message content is not stored** in the audit log unless a future report-resolution flow explicitly allows it.

## Contact

For data requests beyond self-service export/delete, contact your server operator or platform administrator.
