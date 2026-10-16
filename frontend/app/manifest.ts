import type { MetadataRoute } from "next";

/** PWA: cài lên màn hình chính, mở toàn màn hình như một ứng dụng. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIFELY – Điều phối người hiến máu khẩn cấp",
    short_name: "LIFELY",
    description: "Kết nối người cần máu với người hiến máu ở gần. Kết nối. Hiến máu. Cứu một sinh mạng.",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf9f8",
    theme_color: "#be123c",
    categories: ["health", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
