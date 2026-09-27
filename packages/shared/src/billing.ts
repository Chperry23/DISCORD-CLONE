import { z } from "zod";

export const ENTITLEMENT_KINDS = ["SERVER_BOOST", "PROFILE_BADGE"] as const;
export type EntitlementKind = (typeof ENTITLEMENT_KINDS)[number];

export const ENTITLEMENT_STATUSES = ["ACTIVE", "EXPIRED", "CANCELED"] as const;
export type EntitlementStatus = (typeof ENTITLEMENT_STATUSES)[number];

export const serverBoostCheckoutSchema = z.object({
  serverId: z.string().uuid(),
});

export type ServerBoostCheckoutDto = z.infer<typeof serverBoostCheckoutSchema>;

export interface EntitlementResponse {
  id: string;
  kind: EntitlementKind;
  status: EntitlementStatus;
  serverId: string | null;
  validUntil: string | null;
  createdAt: string;
}

export interface MyEntitlementsResponse {
  profileBadge: boolean;
  entitlements: EntitlementResponse[];
}

export interface CheckoutSessionResponse {
  url: string | null;
  sessionId: string;
  /** When Stripe is not configured, checkout is unavailable in this environment. */
  configured: boolean;
}
