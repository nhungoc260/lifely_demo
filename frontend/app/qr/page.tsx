import type { Metadata } from "next";

import { QrPage } from "@/components/pwa/qr-page";

export const metadata: Metadata = { title: "Mã QR LIFELY", robots: { index: false } };

export default function Page() {
  return <QrPage />;
}
