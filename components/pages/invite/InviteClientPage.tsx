'use client';

import AuthButton from "@/components/AuthButton";
import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    Button,
    Container,
    Heading,
    HStack,
    Spinner,
    Text,
    VStack,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import NextLink from "next/link";

const basketballTextureAnimation = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 20px 20px; }
`;

const createBasketballTexture = (color = "rgba(255, 107, 0, 0.4)") => {
  return `
    radial-gradient(circle at 1px 1px, ${color} 1px, transparent 0),
    radial-gradient(circle at 6px 6px, ${color} 1px, transparent 0)
  `;
};

interface InviteClientPageProps {
    error?: string;
    needsLogin?: boolean;
    groupName?: string;
    token?: string; // Pass token for callback URL
}

// This Client Component handles the UI based on the server's processing result
export default function InviteClientPage({
    error,
    needsLogin = false,
    groupName,
    token,
}: InviteClientPageProps) {
    return (
        <Box
            minH="calc(100vh - 80px)"
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
            <Container maxW="container.md" centerContent position="relative" zIndex={2}>
                <VStack 
                    spacing={6} 
                    textAlign="center" 
                    p={10} 
                    borderRadius="xl"
                    backdropFilter="blur(10px)"
                    backgroundColor="rgba(255, 255, 255, 0.75)"
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
                    {error && (
                        <Alert status='error' variant='subtle' flexDirection='column' alignItems='center' justifyContent='center' textAlign='center' borderRadius="md">
                            <AlertIcon boxSize='40px' mr={0} />
                            <AlertTitle mt={4} mb={1} fontSize='lg'>
                                Invite Error
                            </AlertTitle>
                            <AlertDescription maxWidth='sm'>
                                {error} Please check the link or ask for a new invite.
                                <Button as={NextLink} href="/" colorScheme="orange" variant="link" mt={4}>
                                    Go Home
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {needsLogin && groupName && (
                        <>
                            <Heading as="h2" size="lg" color="orange.600">
                                You're Invited!
                            </Heading>
                            <Text fontSize="lg" color="gray.700">
                                You've been invited to join the group: <strong>{groupName}</strong>.
                            </Text>
                            <HStack spacing={5}>
                                <AuthButton token={token} text="Join Group" />
                            </HStack>
                        </>
                    )}

                    {!error && !needsLogin && (
                        // This state should ideally not be reached as the server component redirects on success
                        <VStack>
                            <Heading as="h2" size="lg">Processing Invitation</Heading>
                            <Spinner color="orange.500" />
                            <Text>You should be redirected shortly...</Text>
                        </VStack>
                    )}
                </VStack>
            </Container>
        </Box>
    );
}