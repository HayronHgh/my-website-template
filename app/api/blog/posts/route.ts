import { NextResponse } from "next/server";
import { getBlogListing } from "@/lib/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const query = url.searchParams.get("q") ?? "";
  const seriesSlug = url.searchParams.get("series") ?? undefined;
  const sort = url.searchParams.get("sort");
  const listing = await getBlogListing({
    page,
    query,
    seriesSlug,
    sortOrder: sort === "oldest" ? "oldest" : "newest",
  });

  return NextResponse.json(listing, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
