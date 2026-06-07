/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // NOTE: We intentionally do NOT proxy via `rewrites()`. Next.js evaluates
  // rewrite destinations at BUILD time and bakes them into the manifest, so a
  // runtime BACKEND_URL has no effect. The proxy lives in a Route Handler at
  // src/app/api/proxy/[...path]/route.ts, which reads BACKEND_URL per-request.
};

export default nextConfig;
