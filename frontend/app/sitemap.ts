import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const paths = ["", "/map", "/login", "/register", "/info/faq", "/info/safety", "/info/contact", "/info/privacy", "/info/terms", "/info/medical-disclaimer"];
  return paths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));
}
