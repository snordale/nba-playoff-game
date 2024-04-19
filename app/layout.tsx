import AuthButton from "@/components/AuthButton";
import { Body1 } from "@/components/Body1";
import CustomLink from "@/components/CustomLink";
import { Box, Flex } from "@chakra-ui/react";
import Head from "next/head";
import { Providers } from "./providers";
import { fonts } from "./fonts";

// export const metadata: Metadata = {
//   title: "NBA Playoff Game",
//   description:
//     "Compete with your friends over the course of the playoffs. Pick a player each day and get points for their performance.",
// }

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <Head>
        <title>NBA Playoff Game</title>
        <meta name="description" content="Compete with your friends over the course of the playoffs. Pick a player each day and get points for their performance." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/public/favicon.ico" />
      </Head>
      <Box as="body" className={fonts.rubik.className}>
        <Providers>
          <Flex
            flexDir="column"
            minHeight="100vh"
            position="relative"
            overflow="hidden"
            w='100%'
            maxW="500px"
            mx="auto"
            maxH="100vh"
          >
            <Flex
              justifyContent="space-between"
              overflow="hidden"
              w="100%"
              px={4}
              pt={4}
              pb={2}
              backgroundColor='transparent'
              backdropFilter='blur(12px)'
              position='absolute'
              top={0}
              zIndex={1}
            >
              <CustomLink href="/">
                <Body1 fontWeight={600}>NBA Playoff Game</Body1>
              </CustomLink>
              <AuthButton />
            </Flex>
            <Box as="main" flex={1} w="100%" overflowY='scroll' px={4}>
              <Box minH='calc(100vh - 4rem)' pt={16}>
                {children}
              </Box>
              <Box bottom={0} py={4}>
                <Body1 fontWeight={600}>
                  NBA Playoff Game {new Date().getFullYear()}
                </Body1>
              </Box>
            </Box>

          </Flex>
        </Providers>
      </Box>
    </html>
  );
}
