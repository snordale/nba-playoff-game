import { Body1 } from "@/components/Body1"
import AuthButton from "@/components/AuthButton"
import { Avatar, Box, Container, Flex, Menu, MenuButton } from "@chakra-ui/react"
import { fonts } from "./fonts"
import { Providers } from "./providers"

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
          <Box position='relative' overflow='hidden' w='500px' mx='auto'>

            <Flex justifyContent='space-between' overflow='hidden' w='100%'>
              <Body1>NBA Playoff Game</Body1>
              <AuthButton />
            </Flex>
            <Box as='main' w='100%'>
              {children}
            </Box>
            <Box>
              <Body1>NBA Playoff Game</Body1>
            </Box>
          </Box>
        </Providers>
      </Box>
    </html>

  )
}
