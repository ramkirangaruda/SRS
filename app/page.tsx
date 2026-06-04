// The home page ("/"). We don't show a marketing landing page in Phase 1 — we
// just route people to the right place based on whether they're logged in.
//
// This is a Server Component, so it can read the session on the server and
// redirect before any HTML is sent to the browser (no flicker).
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME, isRole } from "@/lib/roles";

export default async function HomePage() {
  // Read the current session on the server.
  const session = await getServerSession(authOptions);

  // Not logged in → go log in.
  if (!session?.user) {
    redirect("/login");
  }

  // Logged in → send them to their role's dashboard.
  const role = session.user.role;
  redirect(isRole(role) ? ROLE_HOME[role] : "/login");
}
