"use client";

import AuthButton from "@/components/AuthButton";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack
} from "@chakra-ui/react";
import NextLink from "next/link";

const PublicContent = () => {
  return (
    <Box
      minH="calc(100vh - 80px)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={6}
    >
      <Container maxW="container.xl" centerContent>
        <VStack spacing={6} textAlign="center" bg="white" p={10} borderRadius="lg">
          <Heading as="h1" size="2xl" color="orange.600">
            NBA Playoff Game
          </Heading>
          <Text fontSize="xl" color="gray.700">
            Pick one player each day during the NBA Playoffs. Maximize your points based on real game stats (Points, Rebounds, Assists, Steals, Blocks, Turnovers) and compete against your friends!
          </Text>
          <Text fontSize="md" color="gray.500">
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
