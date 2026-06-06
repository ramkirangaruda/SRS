// The PRINCIPAL dashboard ("/dashboard/principal"). A Server Component, so it
// can query the database directly (no API call needed) and render with real data.
import { getServerSession } from "next-auth";
import Link from "next/link";
import { AlertTriangle, Baby, CalendarClock, UserPlus, DoorOpen, TrendingUp } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listEventsForMonth } from "@/lib/events";
import { unplannedDaysThisWeek } from "@/lib/meals";
import { daycareToday } from "@/lib/daycare";
import { followUpsToday } from "@/lib/enquiry";
import { todayCounts as visitorTodayCounts } from "@/lib/visitors";
import { todayKey, formatKey } from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PrincipalDashboard() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const now = new Date();

  // Start-of-month for the "this month" counts.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [studentCount, parentCount, monthEvents, unplanned, daycare, followUps, pendingAdmissions, visitorCounts, monthEnquiries, monthAdmissions, monthConverted] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: "PARENT" } }),
    listEventsForMonth(schoolId, now.getUTCFullYear(), now.getUTCMonth() + 1),
    unplannedDaysThisWeek(schoolId),
    daycareToday(schoolId),
    followUpsToday(schoolId),
    prisma.admissionQuery.count({ where: { schoolId, status: "PENDING" } }),
    visitorTodayCounts(schoolId),
    prisma.enquiry.count({ where: { schoolId, createdAt: { gte: monthStart } } }),
    prisma.student.count({ where: { schoolId, createdAt: { gte: monthStart } } }),
    prisma.enquiry.count({ where: { schoolId, status: "CONVERTED", createdAt: { gte: monthStart } } }),
  ]);
  const todayEvents = monthEvents.filter((e) => e.occurrenceKey === todayKey());
  const conversionRate = monthEnquiries > 0 ? Math.round((monthConverted / monthEnquiries) * 100) : 0;

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

      {/* Admissions / enquiry / visitor widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3 w-3" /> Today&apos;s Follow-ups</p><p className="text-2xl font-bold">{followUps.length}</p></div>
            <Link href="/principal/enquiry" className="text-xs text-blue-600 hover:underline">View</Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><UserPlus className="h-3 w-3" /> Pending Admissions</p><p className="text-2xl font-bold">{pendingAdmissions}</p></div>
            <Link href="/principal/admissions" className="text-xs text-blue-600 hover:underline">Review</Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><TrendingUp className="h-3 w-3" /> This Month</p>
            <p className="text-sm"><strong>{monthEnquiries}</strong> enquiries · <strong>{monthAdmissions}</strong> admissions</p>
            <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div><p className="flex items-center gap-1 text-xs text-muted-foreground"><DoorOpen className="h-3 w-3" /> Visitors Today</p><p className="text-2xl font-bold">{visitorCounts.total}</p><p className="text-xs text-orange-600">{visitorCounts.onPremises} on premises</p></div>
            <Link href="/principal/visitors" className="text-xs text-blue-600 hover:underline">Log</Link>
          </CardContent>
        </Card>
      </div>

      {/* Today's follow-up reminders */}
      {followUps.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-blue-900">
            <p className="mb-1 text-sm font-semibold">Follow-ups due today</p>
            <ul className="space-y-0.5 text-xs">
              {followUps.map((f) => <li key={f.id}><Link href={`/principal/enquiry/${f.id}`} className="hover:underline">{f.parentName}{f.childName ? ` (${f.childName})` : ""} · {f.phone}</Link></li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Daycare Today widget */}
      {daycare.total > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-lg"><Baby className="h-5 w-5" /> Daycare Today</CardTitle>
            <Link href="/principal/daycare" className="text-sm text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div><p className="text-2xl font-bold text-emerald-600">{daycare.checkedIn}</p><p className="text-xs text-muted-foreground">Checked in</p></div>
            <div><p className="text-2xl font-bold text-muted-foreground">{daycare.notArrived}</p><p className="text-xs text-muted-foreground">Not arrived</p></div>
            <div><p className="text-2xl font-bold text-blue-600">{daycare.checkedOut}</p><p className="text-xs text-muted-foreground">Checked out</p></div>
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
