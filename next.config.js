/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  async headers() {
    const hubCache = {
      key: "Cache-Control",
      value: "public, s-maxage=180, stale-while-revalidate=600",
    };
    return [
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
