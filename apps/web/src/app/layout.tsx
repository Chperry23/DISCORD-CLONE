import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus — Where Gamers Connect",
  description: "A modern, privacy-first real-time communication platform built for gamers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
