// POST — given a YouTube/Vimeo URL, return { title, thumbnail, embedUrl } via the
// provider's oEmbed endpoint (server-side to dodge CORS). Principal/teacher.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { fetchOembed } from "@/lib/oembed";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });
  const result = await fetchOembed(body.url);
  if (!result) return NextResponse.json({ error: "Unsupported or invalid video URL" }, { status: 422 });
  return NextResponse.json(result);
}
