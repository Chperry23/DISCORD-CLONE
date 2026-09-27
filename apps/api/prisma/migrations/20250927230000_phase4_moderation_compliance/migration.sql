-- Phase 4: server bans, moderation audit, GDPR export jobs, message FTS index

CREATE TABLE "server_bans" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "banned_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_bans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "moderation_audit_events" (
    "id" TEXT NOT NULL,
    "server_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_user_id" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_data_export_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "download_token" TEXT,
    "payload" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "user_data_export_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "server_bans_server_id_user_id_key" ON "server_bans"("server_id", "user_id");
CREATE INDEX "server_bans_server_id_idx" ON "server_bans"("server_id");
CREATE INDEX "server_bans_user_id_idx" ON "server_bans"("user_id");

CREATE INDEX "moderation_audit_events_server_id_created_at_idx" ON "moderation_audit_events"("server_id", "created_at");
CREATE INDEX "moderation_audit_events_actor_user_id_idx" ON "moderation_audit_events"("actor_user_id");

CREATE UNIQUE INDEX "user_data_export_jobs_download_token_key" ON "user_data_export_jobs"("download_token");
CREATE INDEX "user_data_export_jobs_user_id_created_at_idx" ON "user_data_export_jobs"("user_id", "created_at");

ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "server_bans" ADD CONSTRAINT "server_bans_banned_by_id_fkey" FOREIGN KEY ("banned_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "moderation_audit_events" ADD CONSTRAINT "moderation_audit_events_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_audit_events" ADD CONSTRAINT "moderation_audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_audit_events" ADD CONSTRAINT "moderation_audit_events_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_data_export_jobs" ADD CONSTRAINT "user_data_export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Postgres full-text search over channel messages (member-scoped queries in API)
CREATE INDEX "messages_content_fts_idx" ON "messages" USING gin (to_tsvector('english', "content"));
