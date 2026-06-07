// Principal dashboard — a command center. The heavy lifting is one combined
// endpoint (/api/dashboard/principal) consumed by the client component, which
// shows a skeleton while loading and an error state with retry on failure.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrincipalDashboard } from "@/components/dashboard/principal-dashboard";

export default async function PrincipalDashboardPage() {
  const session = await getServerSession(authOptions);
  const school = await prisma.school.findUnique({ where: { id: session!.user.schoolId }, select: { activeAcademicYear: true } });
  const name = (session!.user.name ?? "Principal").split(" ")[0];
  return <PrincipalDashboard name={name} activeYear={school?.activeAcademicYear ?? null} />;
}
