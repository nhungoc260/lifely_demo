import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation chỉ dùng khi người dùng bấm "Use my location"; các quyền khác tắt hẳn
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
