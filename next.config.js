// @ts-check

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    API_URL: process.env.API_URL,
  },
  // ESLint is enforced in CI (npm run lint). Skip during Vercel builds to avoid
  // config resolution issues in the build environment.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
