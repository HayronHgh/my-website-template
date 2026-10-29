import { requireRequestSession } from "@/lib/admin/session";
import { toApiErrorResponse } from "@/lib/admin/http";
import { workingCopies } from "@/lib/admin/working-copies";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  try {
    const { user } = requireRequestSession(request);
    const { id, name } = await context.params;
    const asset = await workingCopies.readMedia(id, name, user);
    return new Response(new Uint8Array(asset.bytes), {
      headers: {
        "Content-Type": asset.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return toApiErrorResponse(e);
  }
}
