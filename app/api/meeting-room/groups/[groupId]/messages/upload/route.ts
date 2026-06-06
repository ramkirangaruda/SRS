// Upload a file and post it as a FILE message. multipart/form-data.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getMembership, sendMessage } from "@/lib/meeting-room";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  try {
    const stored = await saveUploadedFile(file, "meeting-files");
    const msg = await sendMessage(params.groupId, auth.id, "", { fileUrl: stored.url, fileName: stored.name, fileType: stored.type });
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
