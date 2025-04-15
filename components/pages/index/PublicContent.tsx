"use client";

import AuthButton from "@/components/AuthButton";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
  keyframes,
  Flex,
  Image
} from "@chakra-ui/react";
import NextLink from "next/link";

const gradientAnimation = keyframes`
  0% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-25%, 25%);
  }
  100% {
    transform: translate(0, 0);
  }
`;

const basketballTextureAnimation = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 20px 20px; }
`;

const createBasketballTexture = (color = "rgba(255, 107, 0, 0.05)") => {
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
      p={{ base: 4, md: 6 }}
      position="relative"
      overflow="hidden"
      bg="white"
      sx={{
        "&::before, &::after": {
          content: '""',
          position: "absolute",
          width: "800px",
          height: "800px",
          borderRadius: "50%",
          filter: "blur(100px)",
          opacity: "0.05",
          animation: `${gradientAnimation} 15s ease-in-out infinite`,
          zIndex: 0,
        },
        "&::before": {
          background: "linear-gradient(to right, #FF6B00, #FF8800)",
          top: "-400px",
          left: "-200px",
        },
        "&::after": {
          background: "linear-gradient(to right, #FF3D00, #FF6B00)",
          bottom: "-400px",
          right: "-200px",
          animationDelay: "-7.5s",
        }
      }}
    >
      <Container maxW="container.xl" centerContent position="relative" zIndex={2}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="center"
          gap={{ base: 6, md: 10 }}
          p={{ base: 6, md: 12 }}
          borderRadius="xl"
          backdropFilter="blur(10px)"
          backgroundColor="rgba(255, 255, 255, 0.75)"
          border="1px solid"
          borderColor="gray.200"
          maxW="960px"
          w="full"
          position="relative"
          boxShadow="0 0 40px rgba(0, 0, 0, 0.05)"
          _before={{
            content: '""',
            position: "absolute",
            inset: "-1px",
            borderRadius: "xl",
            padding: "1px",
            background: "linear-gradient(45deg, rgba(255, 107, 0, 0.2), rgba(255, 136, 0, 0.2))",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
          }}
        >
          <VStack
             spacing={{ base: 4, md: 6 }}
             textAlign={{ base: 'center', md: 'left' }}
             alignItems={{ base: 'center', md: 'flex-start'}}
             flex="1"
             maxW={{base: 'full', md: '500px'}}
          >
            <Heading
              as="h1"
              size={{ base: 'xl', md: '2xl' }}
              bgGradient="linear(to-r, #FF6B00, #FF8800)"
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

           <Box
             flex="1"
             maxW={{ base: '250px', md: '350px' }}
             w="full"
             aspectRatio={1}
             backgroundImage={createBasketballTexture('rgba(255, 107, 0, 0.2)')}
             backgroundSize="10px 10px"
             opacity={1}
             animation={`${basketballTextureAnimation} 2s linear infinite`}
             overflow="hidden"
             borderRadius="lg"
             display="flex"
             alignItems="center"
             justifyContent="center"
           >
           </Box>

        </Flex>
      </Container>
    </Box>
  );
};

export default PublicContent;
