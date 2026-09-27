export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-surface-950 px-6 text-center">
      <h1 className="text-2xl font-bold text-white">You&apos;re offline</h1>
      <p className="mt-2 max-w-md text-surface-400">
        Nexus needs a network connection for chat. Reconnect and reload to continue.
      </p>
    </main>
  );
}
