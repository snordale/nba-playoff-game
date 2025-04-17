// app/providers.tsx
"use client";

import { queryClient } from "@/react-query/queries";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = extendTheme({
    fonts: {
      heading: `'Courier', monospace`,
      body: `'Courier', monospace`,
    },
    fontWeights: {
      normal: 500,
      medium: 600,
      bold: 700,
    },
    components: {
      Text: {
        baseStyle: {
          fontWeight: 'medium',
        },
      },
    },
  });

  return (
    <ChakraProvider theme={theme}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    </ChakraProvider>
  );
}
