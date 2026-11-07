import type { Metadata } from "next";
import { ApolyxProvider, ApolyxThemeScript, Toaster, TooltipProvider } from "@altr/apolyx";

import { SiteHeader } from "@/components/site/site-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Apolyx — altr.lab UI kit",
  description:
    "Ownable React components, primitives, motion, and charts with three theme families. Workspace import in the monorepo, CLI everywhere else.",
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/apolyx-logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apolyx-apple-icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApolyxThemeScript />
      </head>
      <body className="font-sans antialiased">
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
