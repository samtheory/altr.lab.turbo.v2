import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { ApolyxProvider, ApolyxThemeScript } from "@altr/apolyx";

import { LocalBanner } from "@/components/local-banner";
import { StudioBlocked } from "@/components/studio-gate";
import { StudioShell } from "@/components/studio-shell";
import { getServerToken } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";

import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Jord Studio",
  description: "Local control plane for Jord — libSQL table editor via jord-server.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = (await headers()).get("x-jord-pathname") ?? "";
  const isLogin = pathname === "/login";
  const session = await getSession();
  const tokenConfigured = Boolean(getServerToken());

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApolyxThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ApolyxProvider defaultTheme="default" defaultMode="system">
          <div className="min-h-screen bg-background text-foreground">
            {isLogin ? (
              <main id="main">{children}</main>
            ) : !tokenConfigured ? (
              <StudioBlocked reason="missing-token" />
            ) : session ? (
              <>
                <LocalBanner role={session.role} bypass={session.bypass} />
                <StudioShell role={session.role} bypass={session.bypass}>
                  {children}
                </StudioShell>
              </>
            ) : (
              <StudioBlocked reason="signed-out" />
            )}
          </div>
        </ApolyxProvider>
      </body>
    </html>
  );
}
