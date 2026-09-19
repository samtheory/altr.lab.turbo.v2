import type { Metadata } from "next";
import { ThemeProvider } from "@altr/ui-kit";

import "./globals.css";

export const metadata: Metadata = {
  title: "altr.lab Trading",
  description: "Trading project UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
