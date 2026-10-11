import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApolyxProvider, ApolyxThemeScript } from "@altr/apolyx";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "altr.lab — hub",
  description: "Landing hub for altr.lab side projects and labs",
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <ApolyxProvider defaultTheme="default" defaultMode="system">
          {children}
        </ApolyxProvider>
      </body>
    </html>
  );
}
