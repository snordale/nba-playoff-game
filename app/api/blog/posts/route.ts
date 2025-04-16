import { prisma } from "@/prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const posts = await prisma.blogPost.findMany({
            orderBy: {
                publishedAt: 'desc'
            },
        });
        return NextResponse.json(posts);
    } catch (error) {
        console.error("Error fetching blog posts:", error);
        // Return an appropriate error response
        return NextResponse.json({ error: "Failed to fetch blog posts" }, { status: 500 });
    }
} 