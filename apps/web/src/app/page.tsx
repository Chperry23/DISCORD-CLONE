import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-brand-700/10 blur-3xl" />
      </div>

      <div className="relative z-10 text-center">
        <h1 className="mb-2 text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 bg-clip-text text-transparent">
            NEXUS
          </span>
        </h1>
        <p className="mb-8 text-lg text-surface-400">
          Where gamers connect. Privacy-first. Built different.
        </p>

        <div className="flex gap-4">
          <Link href="/auth/register" className="btn-primary text-lg px-8 py-3">
            Get Started
          </Link>
          <Link href="/auth/login" className="btn-secondary text-lg px-8 py-3">
            Sign In
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-sm text-surface-500">
        No tracking. No biometrics. Just gaming.
      </div>
    </div>
  );
}
