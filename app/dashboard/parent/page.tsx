// The PARENT dashboard ("/dashboard/parent"). Shows the logged-in parent's own
// children — and ONLY their children, by filtering on their user id.
import { getServerSession } from "next-auth";
import { PartyPopper, Utensils, CalendarRange } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextHoliday } from "@/lib/holidays";
import { todayMenu } from "@/lib/meals";
import { listUpcoming } from "@/lib/events";
import { dayKey, formatKey } from "@/lib/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParentDashboard() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  // Children + the three at-a-glance widgets, fetched in parallel.
  const childIds = (await prisma.student.findMany({ where: { parentId: session!.user.id, schoolId }, select: { classId: true } })).map((c) => c.classId);
  const [children, holiday, menu, upcoming] = await Promise.all([
    prisma.student.findMany({ where: { parentId: session!.user.id, schoolId }, include: { class: true, section: true }, orderBy: { name: "asc" } }),
    nextHoliday(schoolId),
    todayMenu(schoolId, "SCHOOL"),
    listUpcoming(schoolId, 30, { classIds: childIds }),
  ]);
  const nextEvent = upcoming[0] ?? null;
  const lunch = menu?.lunch.length ? menu.lunch.join(", ") : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user?.name}.</p>
      </div>

      {/* Three at-a-glance widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Widget icon={<PartyPopper className="h-5 w-5 text-green-700" />} label="Next Holiday" value={holiday ? `${holiday.name} (${holiday.inDays === 0 ? "today" : `${holiday.inDays} day${holiday.inDays === 1 ? "" : "s"}`})` : "None scheduled"} />
        <Widget icon={<Utensils className="h-5 w-5 text-primary" />} label="Today's Menu" value={lunch ?? "Not planned"} />
        <Widget icon={<CalendarRange className="h-5 w-5 text-blue-700" />} label="Upcoming" value={nextEvent ? `${nextEvent.title} (${formatKey(dayKey(nextEvent.date))})` : "Nothing soon"} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">My Children</h2>
        {children.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No children are linked to your account yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {children.map((child) => (
              <Card key={child.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{child.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {/* Show class + section, plus the admission number for reference. */}
                  Class {child.class.name}
                  {child.section ? ` – Section ${child.section.name}` : ""}
                  <span className="mt-1 block text-xs">#{child.admissionNumber}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// A compact at-a-glance widget card.
function Widget({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-sm font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
