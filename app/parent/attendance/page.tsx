// Parent attendance overview (/parent/attendance). One card per child showing
// this month's attendance % as a ring plus present/absent/late counts.
// Ownership is enforced by getChildrenAttendance(parentId).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChildrenAttendance } from "@/lib/attendance";
import { LOW_ATTENDANCE_THRESHOLD } from "@/lib/attendance-status";
import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "@/components/fees/circular-progress";

export default async function ParentAttendancePage() {
  const session = await getServerSession(authOptions);
  const now = new Date();
  const children = await getChildrenAttendance(
    session!.user.id,
    session!.user.schoolId,
    now.getUTCFullYear(),
    now.getUTCMonth() + 1
  );

  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground">{monthLabel}</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No children are linked to your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((c) => {
            const low = c.counts.total > 0 && c.percentage < LOW_ATTENDANCE_THRESHOLD;
            return (
              <Link key={c.id} href={`/parent/attendance/${c.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardContent className="flex items-center gap-4 p-4">
                    <CircularProgress value={c.percentage} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Class {c.className ?? "—"}
                        {c.sectionName ? ` · ${c.sectionName}` : ""}
                      </p>
                      <div className="mt-2 flex gap-3 text-sm">
                        <span className="text-green-700">P {c.counts.present}</span>
                        <span className="text-red-700">A {c.counts.absent}</span>
                        <span className="text-yellow-700">L {c.counts.late}</span>
                      </div>
                      {low && <p className="mt-1 text-xs font-medium text-amber-700">Low attendance</p>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
