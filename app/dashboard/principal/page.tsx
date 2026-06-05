// The PRINCIPAL dashboard ("/dashboard/principal"). A Server Component, so it
// can query the database directly (no API call needed) and render with real data.
import { getServerSession } from "next-auth";
import { AlertTriangle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listEventsForMonth } from "@/lib/events";
import { unplannedDaysThisWeek } from "@/lib/meals";
import { todayKey, formatKey } from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrincipalDashboard() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const now = new Date();

  const [studentCount, parentCount, monthEvents, unplanned] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: "PARENT" } }),
    listEventsForMonth(schoolId, now.getUTCFullYear(), now.getUTCMonth() + 1),
    unplannedDaysThisWeek(schoolId),
  ]);
  const todayEvents = monthEvents.filter((e) => e.occurrenceKey === todayKey());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Principal Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user?.name}.</p>
      </div>

      {/* Responsive stat grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Students" value={studentCount} />
        <StatCard title="Parents" value={parentCount} />
        <StatCard title="Today's Events" value={todayEvents.length} />
      </div>

      {/* Unplanned meal days warning */}
      {unplanned.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-4 text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">{unplanned.length} day(s) this week have no school meal planned</p>
              <p className="text-xs">{unplanned.map((k) => formatKey(k)).join(" · ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {todayEvents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Today&apos;s Events</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {todayEvents.map((e) => <p key={e.id}>• {e.title}</p>)}
          </CardContent>
        </Card>
      )}
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
