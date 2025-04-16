import { prisma } from "@/prisma/client";
import { NextResponse } from "next/server";

interface Params {
    params: { slug: string };
}

export async function GET(request: Request, { params }: Params) {
    const { slug } = params;

    if (!slug) {
        return NextResponse.json({ error: "Slug parameter is required" }, { status: 400 });
    }

    try {
        const post = await prisma.blogPost.findUnique({
            where: {
                slug: slug,
            },
        });

        if (!post) {
            return NextResponse.json({ error: "Blog post not found" }, { status: 404 });
        }

        return NextResponse.json(post);
    } catch (error) {
        console.error(`Error fetching blog post with slug ${slug}:`, error);
        return NextResponse.json({ error: "Failed to fetch blog post" }, { status: 500 });
    }
}
