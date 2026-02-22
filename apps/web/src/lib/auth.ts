import type { AuthResponse, UserResponse } from "@discord-clone/shared";
import { api } from "./api";

export function storeTokens(tokens: { accessToken: string; refreshToken: string }) {
  localStorage.setItem("accessToken", tokens.accessToken);
  localStorage.setItem("refreshToken", tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

export function getAccessToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
}

export async function register(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/register", data);
  storeTokens(res.tokens);
  return res;
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", data);
  storeTokens(res.tokens);
  return res;
}

export async function logout(): Promise<void> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (refreshToken) {
    await api.post("/auth/logout", { refreshToken }).catch(() => {});
  }
  clearTokens();
}

export async function getMe(): Promise<UserResponse> {
  return api.get<UserResponse>("/auth/me");
}

export async function updateProfile(data: {
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<UserResponse> {
  return api.patch<UserResponse>("/auth/me", data);
}
