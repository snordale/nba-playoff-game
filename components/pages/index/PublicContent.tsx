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
  keyframes
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

const PublicContent = () => {
  return (
    <Box
      minH="calc(100vh - 80px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={6}
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
      <Container maxW="container.xl" centerContent position="relative">
        <VStack 
          spacing={8} 
          textAlign="center" 
          p={12}
          borderRadius="xl"
          backdropFilter="blur(20px)"
          backgroundColor="rgba(255, 255, 255, 0.7)"
          border="1px solid"
          borderColor="gray.200"
          maxW="800px"
          w="full"
          position="relative"
          boxShadow="0 0 40px rgba(0, 0, 0, 0.04)"
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
          <Heading 
            as="h1" 
            size="2xl" 
            bgGradient="linear(to-r, #FF6B00, #FF8800)"
            bgClip="text"
            letterSpacing="-0.02em"
            fontWeight="bold"
          >
            NBA Playoff Game
          </Heading>
          <Text fontSize="xl" color="gray.900" lineHeight="tall">
            Pick one player each day during the NBA Playoffs. Maximize your points based on real game stats (Points, Rebounds, Assists, Steals, Blocks, Turnovers) and compete against your friends!
          </Text>
          <Text fontSize="md" color="gray.600">
            Can you pick the top performers consistently? Sign up or log in to create or join a group!
          </Text>
          <HStack spacing={5} pt={5}>
            <AuthButton />
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
};

export default PublicContent;
