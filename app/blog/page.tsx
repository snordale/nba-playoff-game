// "use client";

import { Container, Heading, SimpleGrid, Box } from "@chakra-ui/react";
import { BlogCard } from "./BlogCard";
import { BasketballBackground } from "@/components/BasketballBackground";
import { prisma } from "@/prisma/client";

export const metadata = {
    title: "Blog | NBA Playoff Game",
    description: "Learn about NBA playoff strategies, scoring systems, and get the most out of your NBA Playoff Game experience.",
};

export default async function BlogPage() {
    const posts = await prisma.blogPost.findMany({
        orderBy: {
            publishedAt: 'desc'
        }
    });

    return (
        <BasketballBackground>
            <Container
                maxW="container.xl"
                py={8}
                px={{ base: 4, md: 6 }}
            >
                <Box p={6} >
                    <Heading mb={8} size="lg">NBA Playoff Game Blog</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
                        {posts.map((post) => (
                            <BlogCard key={post.slug} post={post} />
                        ))}
                    </SimpleGrid>
                </Box>
            </Container>
        </BasketballBackground>
    );
} 