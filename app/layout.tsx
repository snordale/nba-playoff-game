import AuthButton from "@/components/AuthButton";
import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Footer } from '@/components/Footer';
import { Box, Flex } from "@chakra-ui/react";
import type { Metadata } from 'next';
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NBA Playoff Game",
  description:
    "Compete with your friends over the course of the playoffs. Pick a player each day and get points for their performance.",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/favicon.ico' },
    ],
    shortcut: [
      { url: '/favicon.ico' },
    ],
  },
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <Box as="body">
        <Providers>
          <ErrorBoundary>
            <Flex
              flexDir="column"
              minHeight="100vh"
              w='100%'
              mx="auto"
            >
              <Flex
                justifyContent="space-between"
                w="100%"
                px={{ base: 4, md: 6 }}
                py={3}
                h='60px'
                bg='white'
                backdropFilter='blur(12px)'
                position='sticky'
                top={0}
                zIndex={10}
                borderBottom='1px solid'
                borderColor='orange.600'
                alignItems='center'
              >
                <CustomLink href="/">
                  <Body1 fontWeight={600}>NBA Playoff Game</Body1>
                </CustomLink>
                <AuthButton />
              </Flex>
              <Box as="main" flex={1} w="100%">
                <Box minH='calc(100vh - 60px - 57px)'>
                  {children}
                </Box>
                <Footer />
              </Box>
            </Flex>
          </ErrorBoundary>
        </Providers>
      </Box>
    </html>
  );
}
