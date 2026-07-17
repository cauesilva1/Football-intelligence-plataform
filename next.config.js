/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "espncdn.com" },
      { protocol: "https", hostname: "secure.espncdn.com" },
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "tmssl.akamaized.net" },
      { protocol: "https", hostname: "img.a.transfermarkt.technology" },
      { protocol: "https", hostname: "flagcdn.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
  async headers() {
    const hubCache = {
      key: "Cache-Control",
      value: "public, s-maxage=180, stale-while-revalidate=600",
    };
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: security,
      },
      {
        source: "/tournaments/:slug",
        headers: [hubCache],
      },
      {
        source: "/tournaments/:slug/:path*",
        headers: [hubCache],
      },
    ];
  },
};
module.exports = nextConfig;
