import AuthButton from "@/components/AuthButton";
import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Box, Flex } from "@chakra-ui/react";
import type { Metadata } from 'next';
import { fonts } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NBA Playoff Game",
  description:
    "Compete with your friends over the course of the playoffs. Pick a player each day and get points for their performance.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <Box as="body" className={fonts.rubik.className}>
        <Providers>
          <ErrorBoundary>
            <Flex
              flexDir="column"
              minHeight="100vh"
              position="relative"
              overflow="hidden"
              w='100%'
              mx="auto"
              maxH="100vh"
            >
              <Flex
                justifyContent="space-between"
                w="100%"
                px={4}
                pt={4}
                pb={2}
                backgroundColor='transparent'
                backdropFilter='blur(12px)'
                position='absolute'
                top={0}
                zIndex={10}
                borderBottom='1px solid'
                borderColor='orange.600'
              >
                <CustomLink href="/">
                  <Body1 fontWeight={600}>NBA Playoff Game</Body1>
                </CustomLink>
                <AuthButton />
              </Flex>
              <Box as="main" flex={1} w="100%" overflowY='scroll'>
                <Box minH='calc(100vh - 4rem)' pt={16} px={4}>
                  {children}
                </Box>
                <Box bottom={0} py={4} borderTop='1px solid' borderColor='orange.600' px={4}>
                  <Body1 fontWeight={600} color='orange.600'>
                    NBA Playoff Game {new Date().getFullYear()}
                  </Body1>
                </Box>
              </Box>
            </Flex>
          </ErrorBoundary>
        </Providers>
      </Box>
    </html>
  );
}
