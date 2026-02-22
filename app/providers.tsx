"use client";

import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { queryClient } from "@/react-query/queries";
import { QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ToasterProvider } from "@/lib/toaster";
import { system } from "./theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider value={system}>
      <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <ToasterProvider>
          <SessionProvider>
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          </SessionProvider>
        </ToasterProvider>
      </NextThemesProvider>
    </ChakraProvider>
  );
}
