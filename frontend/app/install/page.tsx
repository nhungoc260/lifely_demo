import type { Metadata } from "next";

import { InstallGuide } from "@/components/pwa/install-guide";

export const metadata: Metadata = {
  title: "Cài ứng dụng",
  description: "Cài LIFELY lên màn hình chính điện thoại chỉ với vài chạm.",
  robots: { index: false },
};

export default function InstallPage() {
  return <InstallGuide />;
}
