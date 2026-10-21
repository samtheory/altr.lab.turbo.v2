import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApolyxProvider, ApolyxThemeScript } from "@altr/apolyx";

import { LocalBanner } from "@/components/local-banner";
import { StudioBlocked } from "@/components/studio-gate";
import { StudioShell } from "@/components/studio-shell";
import { isStudioOpen } from "@/lib/studio-gate";

import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Jord Studio",
  description: "Local control plane for Jord — libSQL table editor via jord-server.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const open = isStudioOpen();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApolyxThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ApolyxProvider defaultTheme="default" defaultMode="system">
          <div className="min-h-screen bg-background text-foreground">
            {open ? (
              <>
                <LocalBanner />
                <StudioShell>
                  <main id="main">{children}</main>
                </StudioShell>
              </>
            ) : (
              <StudioBlocked />
            )}
          </div>
        </ApolyxProvider>
      </body>
    </html>
  );
}
