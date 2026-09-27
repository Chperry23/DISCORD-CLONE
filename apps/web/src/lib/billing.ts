import type { MyEntitlementsResponse, CheckoutSessionResponse } from "@discord-clone/shared";
import { api } from "./api";

export async function getMyEntitlements(): Promise<MyEntitlementsResponse> {
  return api.get<MyEntitlementsResponse>("/billing/entitlements/me");
}

export async function startServerBoostCheckout(serverId: string): Promise<CheckoutSessionResponse> {
  return api.post<CheckoutSessionResponse>("/billing/checkout/server-boost", { serverId });
}

export async function startProfileBadgeCheckout(): Promise<CheckoutSessionResponse> {
  return api.post<CheckoutSessionResponse>("/billing/checkout/profile-badge", {});
}
