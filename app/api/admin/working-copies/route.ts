import { handleWorkingCopy } from "@/lib/admin/working-copy-handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (r: Request) => handleWorkingCopy(r);
export const POST = (r: Request) => handleWorkingCopy(r);
