import nextConfig from "eslint-config-next";
import pluginQuery from "@tanstack/eslint-plugin-query";

const config = [
  ...nextConfig,
  {
    plugins: {
      "@tanstack/query": pluginQuery,
    },
    rules: {
      "@tanstack/query/exhaustive-deps": "warn",
      "@tanstack/query/no-rest-destructuring": "warn",
    },
  },
];

export default config;
