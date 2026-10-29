import { handleWorkingCopy } from "@/lib/admin/working-copy-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export const GET = async (r: Request, c: Context) =>
  handleWorkingCopy(r, (await c.params).id);
export const PUT = GET;
export const DELETE = GET;
