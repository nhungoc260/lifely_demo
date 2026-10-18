import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { PwaRegister } from "@/components/pwa/pwa-register";
import { HelpWidget } from "@/components/support/help-widget";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "LIFELY – Điều phối người hiến máu khẩn cấp", template: "%s · LIFELY" },
  description:
    "LIFELY giúp kết nối người cần máu với người hiến máu ở gần và điều phối phản hồi trên một nền tảng đáng tin cậy.",
  openGraph: {
    title: "LIFELY – Điều phối người hiến máu khẩn cấp",
    description: "Kết nối. Hiến máu. Cứu một sinh mạng.",
    type: "website",
    siteName: "LIFELY",
  },
  applicationName: "LIFELY",
  appleWebApp: { capable: true, title: "LIFELY", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  twitter: { card: "summary", title: "LIFELY – Điều phối người hiến máu khẩn cấp", description: "Kết nối. Hiến máu. Cứu một sinh mạng." },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbf9f8" }, { media: "(prefers-color-scheme: dark)", color: "#14110f" }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
          Bỏ qua, đến nội dung
        </a>
        <AppProviders>
          {children}
          <HelpWidget />
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
