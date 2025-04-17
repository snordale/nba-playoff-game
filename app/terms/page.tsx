import { Box, Container, Heading } from "@chakra-ui/react";
import { BasketballBackground } from "@/components/BasketballBackground";

export const metadata = {
    title: "Terms of Service | NBA Playoff Game",
    description: "Terms of Service for NBA Playoff Game - Read our terms and conditions.",
};

export default function TermsPage() {
    return (
        <BasketballBackground>
            <Container
                maxW="container.xl"
                py={8}
                px={{ base: 4, md: 6 }}
            >
                <Box
                    maxW="3xl"
                    mx="auto"
                    bg="rgba(255, 255, 255, 0.9)"
                    backdropFilter="blur(8px)"
                    borderRadius="xl"
                    p={{ base: 4, md: 8 }}
                    border="1px solid"
                    borderColor="gray.200"
                >
                    <Heading as="h1" size="xl" mb={8}>Terms of Service</Heading>
                    <Box
                        className="prose prose-lg prose-slate max-w-none"
                        sx={{
                            'h2': {
                                color: 'gray.800',
                                fontWeight: '600',
                                fontSize: '1.875rem',
                                marginTop: '2rem',
                                marginBottom: '1rem',
                            },
                            'h3': {
                                color: 'gray.800',
                                fontWeight: '600',
                                fontSize: '1.5rem',
                                marginTop: '1.5rem',
                                marginBottom: '0.75rem',
                            },
                            'p': {
                                color: 'gray.700',
                                marginTop: '1.25rem',
                                marginBottom: '1.25rem',
                                lineHeight: '1.8',
                            },
                            'ul, ol': {
                                color: 'gray.700',
                                marginTop: '1.25rem',
                                marginBottom: '1.25rem',
                                paddingLeft: '1.75rem',
                            },
                            'li': {
                                marginTop: '0.5rem',
                                marginBottom: '0.5rem',
                            },
                        }}
                    >
                        <h2>1. Acceptance of Terms</h2>
                        <p>By accessing and using NBA Playoff Game, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.</p>

                        <h2>2. Description of Service</h2>
                        <p>NBA Playoff Game is a fantasy sports platform that allows users to make daily player selections during the NBA playoffs. Users can create and join groups to compete with friends based on their selections.</p>

                        <h2>3. User Accounts</h2>
                        <p>To use NBA Playoff Game, you must:</p>
                        <ul>
                            <li>Be at least 18 years old</li>
                            <li>Provide accurate and complete registration information</li>
                            <li>Maintain the security of your account</li>
                            <li>Notify us immediately of any unauthorized use</li>
                        </ul>

                        <h2>4. Fair Play</h2>
                        <p>Users must:</p>
                        <ul>
                            <li>Make selections independently</li>
                            <li>Not use automated tools or bots</li>
                            <li>Not manipulate or attempt to manipulate scores</li>
                            <li>Not create multiple accounts</li>
                        </ul>

                        <h2>5. Content Guidelines</h2>
                        <p>Users are responsible for all content they post, including group names, messages, and comments. Content must not be:</p>
                        <ul>
                            <li>Illegal or promoting illegal activities</li>
                            <li>Harassing, abusive, or discriminatory</li>
                            <li>False or misleading</li>
                            <li>In violation of intellectual property rights</li>
                        </ul>

                        <h2>6. Service Modifications</h2>
                        <p>We reserve the right to:</p>
                        <ul>
                            <li>Modify or discontinue any part of the service</li>
                            <li>Change scoring systems or rules with notice</li>
                            <li>Remove content that violates these terms</li>
                            <li>Suspend or terminate accounts for violations</li>
                        </ul>

                        <h2>7. Limitation of Liability</h2>
                        <p>NBA Playoff Game is provided "as is" without warranties of any kind. We are not liable for:</p>
                        <ul>
                            <li>Service interruptions or data loss</li>
                            <li>Actions of other users</li>
                            <li>Scoring or statistical errors</li>
                            <li>Any indirect, consequential, or incidental damages</li>
                        </ul>

                        <h2>8. Changes to Terms</h2>
                        <p>We may update these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>

                        <h2>9. Contact Information</h2>
                        <p>For questions about these terms, please contact us at snordale@gmail.com</p>
                    </Box>
                </Box>
            </Container>
        </BasketballBackground>
    );
} 