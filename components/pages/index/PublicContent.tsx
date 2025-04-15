"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  keyframes
} from "@chakra-ui/react";

const basketballTextureAnimation = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 20px 20px; } // Adjust size for desired speed
`;

const createBasketballTexture = (color = "rgba(255, 107, 0, 0.4)") => { // Increased dot opacity
  return `
    radial-gradient(circle at 1px 1px, ${color} 1px, transparent 0),
    radial-gradient(circle at 6px 6px, ${color} 1px, transparent 0)
  `;
};

const PublicContent = () => {
  return (
    <Box
      minH="calc(100vh - 60px - 57px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
      bg="white"
    >
      <Box
        position="absolute"
        inset={0}
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
      <Container maxW="container.xl" centerContent position="relative" zIndex={2} px={{ base: 4, md: 6 }}>
        <VStack
          spacing={{ base: 6, md: 8 }}
          textAlign="center"
          p={{ base: 4, sm: 6, md: 12 }}
          borderRadius="xl"
          backdropFilter="blur(10px)"
          backgroundColor="rgba(255, 255, 255, 0.75)"
          maxW="800px"
          w="full"
          position="relative"
          boxShadow="0 0 40px rgba(0, 0, 0, 0.05)"
          sx={{
            position: 'relative',
            border: '2px solid transparent',
            backgroundClip: 'padding-box',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              borderRadius: 'xl',
              padding: '2px',
              background: 'linear-gradient(to right, var(--chakra-colors-orange-400), var(--chakra-colors-orange-500), var(--chakra-colors-orange-600))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none'
            }
          }}
        >
          <Heading
            as="h1"
            size={{ base: 'xl', md: '2xl' }}
            bgGradient="linear(to-r, orange.400, orange.500, orange.600)"
            bgClip="text"
            letterSpacing="-0.02em"
            fontWeight="bold"
          >
            NBA Playoff Game
          </Heading>
          <Text fontSize={{ base: 'lg', md: 'xl' }} color="gray.900" lineHeight="tall">
            Pick one player each day during the NBA Playoffs. Maximize your points based on real game stats (Points, Rebounds, Assists, Steals, Blocks, Turnovers) and compete against your friends!
          </Text>
          <Text fontSize="md" color="gray.600">
            Can you pick the top performers consistently? Sign up or log in to create or join a group!
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};

export default PublicContent;
