import { posts, Post as StaticPostData } from '@/app/blog/posts'; // Adjust path if needed
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    // Basic security check for cron jobs
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("Unauthorized cron attempt.");
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting blog post loading via cron...');
    let successCount = 0;
    let errorCount = 0;

    try {
        // Fetch posts using the function that reads the static data
        const staticPosts: StaticPostData[] = posts;

        for (const post of staticPosts) {
            console.log(`Processing post: ${post.title}`);
            try {
                await prisma.blogPost.upsert({
                    where: { slug: post.slug },
                    update: {
                        title: post.title,
                        publishedAt: new Date(post.date),
                        excerpt: post.excerpt,
                        content: post.content,
                    },
                    create: {
                        slug: post.slug,
                        title: post.title,
                        publishedAt: new Date(post.date),
                        excerpt: post.excerpt,
                        content: post.content,
                    },
                });
                console.log(`Successfully upserted post: ${post.title}`);
                successCount++;
            } catch (error) {
                console.error(`Error processing post ${post.title}:`, error);
                errorCount++;
            }
        }

        console.log(`Blog post loading finished. Success: ${successCount}, Errors: ${errorCount}`);
        return NextResponse.json({ message: `Blog post loading finished. Success: ${successCount}, Errors: ${errorCount}` });

    } catch (error) {
        console.error("Error fetching static posts:", error);
        return NextResponse.json({ message: 'Error fetching static posts' }, { status: 500 });
    } finally {
        // Disconnect Prisma client - consider connection pooling for frequent calls
        await prisma.$disconnect();
    }
} 