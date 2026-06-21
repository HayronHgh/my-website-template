import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog";

type BlogPostApiRouteContext = {
  params: Promise<{
    slug: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_request: Request, { params }: BlogPostApiRouteContext) {
  const { slug: slugSegments } = await params;
  const slug = slugSegments.join("/");
  const post = await getPostBySlug(slug);

  if (!post?.published) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(post, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
