import { Box, Container, SimpleGrid, Stack, Text, Heading, Link } from "@chakra-ui/react";
import CustomLink from "./CustomLink";
import { auth } from "@/auth";

export const Footer = async () => {
  const session = await auth();

  return (
    <Box as="footer" py={10} borderTop="1px solid" borderColor="orange.600">
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8}>
          <Stack spacing={6}>
            <Heading size="md" color="orange.600">NBA Playoff Game</Heading>
            <Text color="gray.600" fontSize="sm">
              The ultimate fantasy game for NBA playoff enthusiasts. Make daily picks and compete with friends!
            </Text>
          </Stack>
          
          <Stack spacing={4}>
            <Heading size="sm" color="gray.700">Quick Links</Heading>
            <CustomLink href="/" color="gray.600" fontSize="sm">Home</CustomLink>
            <CustomLink href="/blog" color="gray.600" fontSize="sm">Blog</CustomLink>
            {session && (
              <CustomLink href="/" color="gray.600" fontSize="sm">My Groups</CustomLink>
            )}
          </Stack>

          <Stack spacing={4}>
            <Heading size="sm" color="gray.700">Resources</Heading>
            <CustomLink href="/blog/how-to-play" color="gray.600" fontSize="sm">How to Play</CustomLink>
            <CustomLink href="/blog/scoring-system" color="gray.600" fontSize="sm">Scoring System</CustomLink>
            <CustomLink href="/blog/strategy-guide" color="gray.600" fontSize="sm">Strategy Guide</CustomLink>
          </Stack>

          <Stack spacing={4}>
            <Heading size="sm" color="gray.700">Legal</Heading>
            <CustomLink href="/terms" color="gray.600" fontSize="sm">Terms of Service</CustomLink>
            <CustomLink href="/privacy" color="gray.600" fontSize="sm">Privacy Policy</CustomLink>
            <CustomLink href="mailto:snordale@gmail.com" color="gray.600" fontSize="sm">Contact Us</CustomLink>
          </Stack>
        </SimpleGrid>

        <Text mt={8} pt={8} fontSize="sm" color="gray.600" borderTop="1px solid" borderColor="gray.200" textAlign="center">
          © {new Date().getFullYear()} NBA Playoff Game. All rights reserved.
        </Text>
      </Container>
    </Box>
  );
}; 