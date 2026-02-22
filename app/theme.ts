"use client";

import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
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
    },
  },
});

export const system = createSystem(defaultConfig, config);
