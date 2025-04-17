// "use client";

import { BasketballBackground } from "@/components/BasketballBackground";
import CustomLink from "@/components/CustomLink";
import { prisma } from "@/prisma/client"; // Import Prisma client
// import { Spinner, Center } from "@chakra-ui/react";
import { Box, Container, Heading, Text } from "@chakra-ui/react";
import { notFound } from "next/navigation"; // Import notFound for 404 handling
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
// import { useGetBlogPost } from "@/react-query/queries";

type Params = Promise<{ slug: string }>

// Make component async and fetch data directly
export default async function BlogPost({ params }: { params: Params }) {
    const { slug } = await params;

    // Fetch post directly using Prisma
    const post = await prisma.blogPost.findUnique({
        where: {
            slug: slug,
        },
    });

    // Handle not found case for server components
    if (!post) {
        notFound();
    }

    // Remove client-side loading/error/!post states
    /*
    if (isLoading) { ... }
    if (isError) { ... }
    if (!post) { ... } // Handled by notFound() above
    */

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
                    <CustomLink href="/blog" mb={4} display="inline-flex" alignItems="center" color="orange.600" _hover={{ color: 'orange.700' }}>
                        <Text fontSize="sm">← Back to Blog</Text>
                    </CustomLink>

                    <Heading as="h1" size="xl" mb={0} pb={0}>{post.title}</Heading>
                    <Text fontSize="sm" color="orange.600" mb={2} mt={6}>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                    <Box
                        className="prose prose-lg prose-slate max-w-none"
                        sx={{
                            'h1': {
                                display: 'none',
                                color: 'gray.900',
                                fontWeight: '700',
                                fontSize: '2.25rem',
                                marginTop: '2rem',
                                marginBottom: '1.5rem',
                            },
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
                            'table': {
                                width: '100%',
                                marginY: '2rem',
                                borderCollapse: 'collapse',
                                border: '1px solid',
                                borderColor: 'gray.200',
                            },
                            'thead': {
                                backgroundColor: 'gray.50',
                                borderBottom: '2px solid',
                                borderColor: 'gray.200',
                            },
                            'th': {
                                padding: '1rem',
                                textAlign: 'left',
                                fontWeight: '600',
                                color: 'gray.900',
                            },
                            'td': {
                                padding: '1rem',
                                borderTop: '1px solid',
                                borderColor: 'gray.200',
                                color: 'gray.700',
                            },
                            'tr': {
                                borderBottom: '1px solid',
                                borderColor: 'gray.200',
                            },
                            'tr:hover': {
                                backgroundColor: 'gray.50',
                            },
                            'a': {
                                color: 'orange.600',
                                textDecoration: 'underline',
                                _hover: {
                                    color: 'orange.700',
                                },
                            },
                            'strong': {
                                color: 'gray.900',
                                fontWeight: '600',
                            },
                            'blockquote': {
                                borderLeftWidth: '4px',
                                borderColor: 'orange.200',
                                paddingLeft: '1rem',
                                color: 'gray.700',
                                fontStyle: 'italic',
                                marginY: '1.5rem',
                            },
                            'code': {
                                color: 'gray.800',
                                backgroundColor: 'gray.100',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.875em',
                            },
                        }}
                    >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
                    </Box>
                </Box>
            </Container>
        </BasketballBackground>
    );
}

// Re-add generateStaticParams for SSG
export async function generateStaticParams() {
    // Fetch all slugs from the database
    const posts = await prisma.blogPost.findMany({
        select: { slug: true }, // Only select the slug field
    });

    // Return the format Next.js expects: { slug: string }[]
    return posts.map((post) => ({
        slug: post.slug,
    }));
}