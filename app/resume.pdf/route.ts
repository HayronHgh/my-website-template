import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import {
  getSafeResumePdfFilePath,
  RESUME_PDF_DOWNLOAD_NAME,
} from "@/lib/site/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const filePath = await getSafeResumePdfFilePath();

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(filePath);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${RESUME_PDF_DOWNLOAD_NAME}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
