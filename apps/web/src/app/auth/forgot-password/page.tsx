"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { requestPasswordResetSchema, resetPasswordSchema } from "@discord-clone/shared";
import { ApiError } from "@/lib/api";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromUrl ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = requestPasswordResetSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Invalid email");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password-reset/request", { email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = resetPasswordSchema.safeParse({ token, newPassword });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm", { token, newPassword });
      setResetDone(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (resetDone) {
    return (
      <div className="card animate-slide-up text-center">
        <h1 className="mb-2 text-2xl font-bold">Password updated</h1>
        <Link href="/auth/login" className="btn-primary mt-4 inline-block">
          Sign in
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="card animate-slide-up text-center">
        <div className="mb-4 text-4xl">&#9993;</div>
        <h1 className="mb-2 text-2xl font-bold">Check Your Email</h1>
        <p className="mb-6 text-surface-400">
          If that email is registered, we sent a reset link.
        </p>
        <Link href="/auth/login" className="btn-secondary">
          Back to login
        </Link>
      </div>
    );
  }

  if (tokenFromUrl || token) {
    return (
      <div className="card animate-slide-up">
        <h1 className="mb-4 text-2xl font-bold">Choose a new password</h1>
        <form onSubmit={handleConfirm} className="space-y-4">
          {!tokenFromUrl && (
            <input
              className="input-field"
              placeholder="Reset token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}
          <input
            type="password"
            className="input-field"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Saving..." : "Reset password"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
          Reset Password
        </h1>
        <p className="mt-2 text-surface-400">We&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleRequest} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-300">Email</label>
          <input
            type="email"
            className="input-field"
            placeholder="gamer@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-surface-400">
        Remember your password?{" "}
        <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="card">Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
