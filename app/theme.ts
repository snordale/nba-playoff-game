"use client";

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  globalCss: {
    "html, :root": {
      colorPalette: "orange",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: "'Courier', monospace" },
        body: { value: "'Courier', monospace" },
      },
      fontWeights: {
        normal: { value: "500" },
        medium: { value: "600" },
        bold: { value: "700" },
      },
      colors: {
        orange: {
          50: { value: "#fff7ed" },
          100: { value: "#ffedd5" },
          200: { value: "#fed7aa" },
          300: { value: "#fdba74" },
          400: { value: "#fb923c" },
          500: { value: "#f97316" },
          600: { value: "#ea580c" },
          700: { value: "#c2410c" },
          800: { value: "#9a3412" },
          900: { value: "#7c2d12" },
        },
      },
    },
    semanticTokens: {
      colors: {
        orange: {
          solid: { value: "{colors.orange.600}" },
          contrast: { value: "white" },
          fg: { value: "{colors.orange.700}" },
          muted: { value: "{colors.orange.100}" },
          subtle: { value: "{colors.orange.200}" },
          emphasized: { value: "{colors.orange.300}" },
          focusRing: { value: "{colors.orange.500}" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
