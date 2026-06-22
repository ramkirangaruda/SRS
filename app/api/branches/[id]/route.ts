// PATCH /api/branches/[id] — update a branch's name and/or enabled modules.
// PRINCIPAL only, and scoped to the caller's school (ownership check). Module
// keys are validated/normalised via serializeModules so only known keys persist.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { serializeModules, type ModuleKey } from "@/lib/modules";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: { name?: string; enabledModules?: ModuleKey[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Build the update from only the fields provided.
  const data: { name?: string; enabledModules?: string } = {};
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    if (name.length > 60) return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    data.name = name;
  }
  if (body.enabledModules !== undefined) {
    if (!Array.isArray(body.enabledModules)) {
      return NextResponse.json({ error: "enabledModules must be an array" }, { status: 400 });
    }
    // serializeModules drops anything that isn't a known module key.
    data.enabledModules = serializeModules(body.enabledModules);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Ownership: updateMany with the schoolId filter so another school's branch id
  // can't be touched. count === 0 means it wasn't found in this school.
  const result = await prisma.branch.updateMany({
    where: { id: params.id, schoolId: auth.schoolId },
    data,
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
