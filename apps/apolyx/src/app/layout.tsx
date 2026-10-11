import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApolyxProvider, ApolyxThemeScript, Toaster, TooltipProvider } from "@altr/apolyx";

import { SiteHeader } from "@/components/site/site-header";

import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Apolyx — altr.lab UI kit",
  description:
    "Ownable React components, primitives, motion, and charts with three theme families. Workspace import in the monorepo, CLI everywhere else.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApolyxThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ApolyxProvider defaultTheme="default" defaultMode="system">
          <TooltipProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:shadow-md"
            >
              Skip to content
            </a>
            <div className="min-h-screen bg-background text-foreground">
              <SiteHeader />
              <main id="main">{children}</main>
            </div>
            <Toaster />
          </TooltipProvider>
        </ApolyxProvider>
      </body>
    </html>
  );
}
