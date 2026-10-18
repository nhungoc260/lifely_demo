import type { MetadataRoute } from "next";

/** PWA: cài lên màn hình chính, mở toàn màn hình như một ứng dụng. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LIFELY – Điều phối người hiến máu khẩn cấp",
    short_name: "LIFELY",
    description: "Kết nối người cần máu với người hiến máu ở gần. Kết nối. Hiến máu. Cứu một sinh mạng.",
    lang: "vi",
    // Mở thẳng vào /open: đã đăng nhập thì vào trang của vai trò, chưa thì vào đăng nhập (bỏ qua trang giới thiệu).
    // PWA và APK (TWA) cùng đọc manifest này nên luôn mở giống nhau.
    id: "/",
    start_url: "/open",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf9f8",
    theme_color: "#be123c",
    categories: ["health", "medical"],
    shortcuts: [
      { name: "Bản đồ", short_name: "Bản đồ", url: "/map", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Trợ giúp", short_name: "Trợ giúp", url: "/info/faq", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
