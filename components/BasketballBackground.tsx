"use client";

import { Box, keyframes } from "@chakra-ui/react";
import { ReactNode } from "react";

const basketballTextureAnimation = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 20px 20px; }
`;

const createBasketballTexture = (color = "rgba(255, 107, 0, 0.4)") => {
  return `
    radial-gradient(circle at 1px 1px, ${color} 1px, transparent 0),
    radial-gradient(circle at 6px 6px, ${color} 1px, transparent 0)
  `;
};

interface BasketballBackgroundProps {
  children: ReactNode;
}

export const BasketballBackground = ({ children }: BasketballBackgroundProps) => {
  return (
    <Box
      position="relative"
      minH="calc(100vh - 60px - 57px)"
      overflow="hidden"
      bg="white"
    >
      <Box
        position="absolute"
        inset={0}
        zIndex={1}
        sx={{
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: createBasketballTexture(),
            backgroundSize: "12px 12px",
            animation: `${basketballTextureAnimation} 3s linear infinite`,
            opacity: "1.0",
            zIndex: 1,
            pointerEvents: "none",
          }
        }}
      />
      <Box position="relative" zIndex={2}>
        {children}
      </Box>
    </Box>
  );
}; 