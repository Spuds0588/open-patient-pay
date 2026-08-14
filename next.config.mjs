/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Linting is run separately; keep `next build` from failing on CI-only config drift.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
