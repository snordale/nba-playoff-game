import { Box, Container, Heading } from "@chakra-ui/react";
import { BasketballBackground } from "@/components/BasketballBackground";

export const metadata = {
    title: "Privacy Policy | NBA Playoff Game",
    description: "Privacy Policy for NBA Playoff Game - Learn how we protect your data.",
};

export default function PrivacyPage() {
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
                    <Heading as="h1" size="xl" mb={8}>Privacy Policy</Heading>
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
                        <h2>1. Introduction</h2>
                        <p>At NBA Playoff Game, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information when you use our service.</p>

                        <h2>2. Information We Collect</h2>
                        <h3>Account Information</h3>
                        <ul>
                            <li>Name and email address</li>
                            <li>Profile information you choose to provide</li>
                            <li>Authentication provider information</li>
                        </ul>

                        <h3>Usage Information</h3>
                        <ul>
                            <li>Player selections and game history</li>
                            <li>Group participation and interactions</li>
                            <li>Comments and messages</li>
                            <li>Device and browser information</li>
                        </ul>

                        <h2>3. How We Use Your Information</h2>
                        <p>We use your information to:</p>
                        <ul>
                            <li>Provide and improve our services</li>
                            <li>Process your player selections</li>
                            <li>Manage your account and groups</li>
                            <li>Send important service updates</li>
                            <li>Analyze and improve our platform</li>
                            <li>Prevent fraud and abuse</li>
                        </ul>

                        <h2>4. Information Sharing</h2>
                        <p>We do not sell your personal information. We may share your information:</p>
                        <ul>
                            <li>With other group members (limited to display name and game activity)</li>
                            <li>With service providers who assist in operating our platform</li>
                            <li>When required by law or to protect our rights</li>
                            <li>With your consent</li>
                        </ul>

                        <h2>5. Data Security</h2>
                        <p>We implement appropriate security measures to protect your information, including:</p>
                        <ul>
                            <li>Encryption of sensitive data</li>
                            <li>Regular security assessments</li>
                            <li>Access controls and monitoring</li>
                            <li>Secure data storage practices</li>
                        </ul>

                        <h2>6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal information</li>
                            <li>Correct inaccurate information</li>
                            <li>Request deletion of your account</li>
                            <li>Opt-out of promotional communications</li>
                            <li>Export your data</li>
                        </ul>

                        <h2>7. Cookies and Tracking</h2>
                        <p>We use cookies and similar technologies to:</p>
                        <ul>
                            <li>Keep you signed in</li>
                            <li>Remember your preferences</li>
                            <li>Analyze site usage</li>
                            <li>Improve user experience</li>
                        </ul>

                        <h2>8. Children's Privacy</h2>
                        <p>Our service is not intended for users under 18 years of age. We do not knowingly collect information from children under 18.</p>

                        <h2>9. Changes to Privacy Policy</h2>
                        <p>We may update this policy periodically. We will notify you of significant changes through the service or via email.</p>

                        <h2>10. Contact Us</h2>
                        <p>For privacy-related questions or concerns, please contact us at privacy@nbaplayoffgame.com</p>
                    </Box>
                </Box>
            </Container>
        </BasketballBackground>
    );
} 