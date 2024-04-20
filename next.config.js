// @ts-check

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    API_URL: process.env.API_URL,
  },
};

module.exports = nextConfig;
