/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    // BACKEND_URL is a server-side env var (no NEXT_PUBLIC_ prefix) so it
    // can be set differently per environment without a rebuild:
    //   local Docker:  http://backend:8000  (container DNS)
    //   Railway:       http://backend:8000  (Railway private network)
    //   dev machine:   http://localhost:8000
    const backendUrl =
      process.env.BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:8000";
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
