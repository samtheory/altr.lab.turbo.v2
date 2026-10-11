import type { Metadata } from "next";
import { ApolyxProvider, ApolyxThemeScript } from "@altr/apolyx";

import "./globals.css";

export const metadata: Metadata = {
  title: "altr.lab",
  description: "altr.lab marketing and public site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApolyxThemeScript />
      </head>
      <body>
        <ApolyxProvider defaultTheme="default" defaultMode="system">
          {children}
        </ApolyxProvider>
      </body>
    </html>
  );
}
