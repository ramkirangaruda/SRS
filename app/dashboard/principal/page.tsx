// The PRINCIPAL dashboard ("/dashboard/principal"). A Server Component, so it
// can query the database directly (no API call needed) and render with real data.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrincipalDashboard() {
  const session = await getServerSession(authOptions);

  // School-wide counts — the kind of overview a principal wants. These run as
  // SQL COUNT queries against SQLite via Prisma.
  const [studentCount, parentCount] = await Promise.all([
    prisma.student.count(),
    prisma.user.count({ where: { role: "PARENT" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Principal Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user?.name}.</p>
      </div>

      {/* Responsive stat grid: 1 column on mobile, 3 on larger screens. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Students" value={studentCount} />
        <StatCard title="Parents" value={parentCount} />
        <StatCard title="Open Notices" value={0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This is your school overview. In later phases we&apos;ll add student
          management, announcements, and attendance here.
        </CardContent>
      </Card>
    </div>
  );
}

// A tiny presentational helper for the stat cards. Kept local since it's only
// used on this page.
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
