/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // BullMQ / ioredis are server-only; keep them out of the client bundle.
  serverExternalPackages: ["bullmq", "ioredis"],
};

export default nextConfig;
