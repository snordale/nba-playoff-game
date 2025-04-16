import CustomLink from "@/components/CustomLink";
import { Card, CardBody, Heading, Text } from "@chakra-ui/react";
import type { BlogPost } from "@prisma/client";

interface BlogCardProps {
    post: BlogPost;
}

export const BlogCard = ({ post }: BlogCardProps) => {
    return (
        <CustomLink href={`/blog/${post.slug}`} _hover={{ textDecoration: 'none' }}>
            <Card
                variant="outline"
                _hover={{
                    borderColor: "orange.400",
                    boxShadow: "sm",
                    transform: "translateY(-2px)",
                }}
                transition="all 0.2s"
                height="100%"
            >
                <CardBody>
                    <Text fontSize="sm" color="orange.600" mb={2}>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                    <Heading size="md" mb={2}>{post.title}</Heading>
                    <Text color="gray.600" noOfLines={3}>{post.excerpt}</Text>
                </CardBody>
            </Card>
        </CustomLink>
    );
}; 