'use client';

import {
    Box,
    Button,
    Container,
    Heading,
    HStack,
    Spinner,
    Text,
    VStack,
    Alert,
    AlertIcon,
    AlertTitle,
    AlertDescription,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { signIn } from "next-auth/react"; // Import signIn
import React from "react";

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

    // Construct callback URL to return to this page after login/signup
    const callbackUrl = token ? `/invite?token=${token}` : '/';

    const handleSignIn = () => {
        signIn(undefined, { callbackUrl }); // Redirects to sign-in, then back here
    };

    return (
        <Box
            minH="calc(100vh - 80px)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgGradient="linear(to-br, orange.50, yellow.50)"
            p={6}
        >
            <Container maxW="container.md" centerContent>
                <VStack spacing={6} textAlign="center" bg="white" p={10} borderRadius="lg" boxShadow="md">
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
                            <Text fontSize="md" color="gray.500">
                                Please log in or sign up to accept the invitation.
                            </Text>
                            <HStack spacing={5} pt={5}>
                                <Button
                                    onClick={handleSignIn} // Use signIn from next-auth
                                    colorScheme="orange"
                                    size="lg"
                                    px={8}
                                    _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
                                >
                                    Login or Sign Up
                                </Button>
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