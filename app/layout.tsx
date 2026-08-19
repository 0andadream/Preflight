import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PREflight — security checks before AI agents move money",
  description:
    "Deterministic transaction security for autonomous agents on X Layer. Check. Decide. Attest.",
  icons: {
    icon: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7);
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <div className="pointer-events-none fixed bottom-3 right-4 font-mono text-[10px] uppercase tracking-[0.14em] text-paper-500">
          build {sha}
        </div>
      </body>
    </html>
  );
}
