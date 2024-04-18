import AuthButton from "@/components/AuthButton";
import { Body1 } from "@/components/Body1";
import { Box, Flex } from "@chakra-ui/react";
import { fonts } from "./fonts";
import { Providers } from "./providers";

// export const metadata: Metadata = {
//   title: "NBA Playoff Game",
//   description:
//     "Compete with your friends over the course of the playoffs. Pick a player each day and get points for their performance.",
// }

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <Box as="body" className={fonts.rubik.variable}>
        <Providers>
          <Flex
            flexDir="column"
            minHeight="100vh"
            position="relative"
            overflow="hidden"
            w='100%'
            maxW="500px"
            mx="auto"
            p={4}
          >
            <Flex
              justifyContent="space-between"
              overflow="hidden"
              w="100%"
              pb={4}
            >
              <Body1 fontWeight={600}>NBA Playoff Game</Body1>
              <AuthButton />
            </Flex>
            <Box as="main" flex="1" w="100%">
              {children}
            </Box>
            <Box mt="auto">
              <Body1 fontWeight={600}>
                NBA Playoff Game {new Date().getFullYear()}
              </Body1>
            </Box>
          </Flex>
        </Providers>
      </Box>
    </html>
  );
}
