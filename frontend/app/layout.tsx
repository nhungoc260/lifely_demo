import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "LIFELY – Emergency Blood Donor Coordination", template: "%s · LIFELY" },
  description:
    "LIFELY helps connect people who need blood with nearby donors and coordinates responses through one trusted platform.",
  openGraph: {
    title: "LIFELY – Emergency Blood Donor Coordination",
    description: "Connect. Donate. Save a Life.",
    type: "website",
    siteName: "LIFELY",
  },
  twitter: { card: "summary", title: "LIFELY – Emergency Blood Donor Coordination", description: "Connect. Donate. Save a Life." },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbf9f8" }, { media: "(prefers-color-scheme: dark)", color: "#14110f" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
