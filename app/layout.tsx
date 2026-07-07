import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "StackMap",
  description: "Personal tool and subscription relationship map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        {process.env.ELECTRON_BUILD === "true" ? null : <Analytics />}
      </body>
    </html>
  );
}
