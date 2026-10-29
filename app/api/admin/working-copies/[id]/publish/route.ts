import { handleWorkingCopy } from "@/lib/admin/working-copy-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = async (
  r: Request,
  c: { params: Promise<{ id: string }> },
) => handleWorkingCopy(r, (await c.params).id, true);
