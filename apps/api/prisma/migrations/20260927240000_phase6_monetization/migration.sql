-- Phase 6: Stripe billing entitlements (cosmetics / server boost only)

CREATE TABLE "billing_customers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entitlements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "server_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "valid_until" TIMESTAMP(3),
    "last_stripe_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_customers_user_id_key" ON "billing_customers"("user_id");
CREATE UNIQUE INDEX "billing_customers_stripe_customer_id_key" ON "billing_customers"("stripe_customer_id");

CREATE UNIQUE INDEX "entitlements_stripe_subscription_id_key" ON "entitlements"("stripe_subscription_id");
CREATE UNIQUE INDEX "entitlements_stripe_checkout_session_id_key" ON "entitlements"("stripe_checkout_session_id");
CREATE INDEX "entitlements_user_id_kind_status_idx" ON "entitlements"("user_id", "kind", "status");
CREATE INDEX "entitlements_server_id_kind_status_idx" ON "entitlements"("server_id", "kind", "status");

ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
