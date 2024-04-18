/** @type {import("next").NextConfig} */
module.exports = {
  output: "standalone",
  env: {
    API_URL: process.env.API_URL,
  }
}
