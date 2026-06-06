// Atomically bump the download counter and return the file/external URL.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { recordDownload } from "@/lib/planners";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const url = await recordDownload(params.id, auth.schoolId);
  if (!url) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ url });
}
