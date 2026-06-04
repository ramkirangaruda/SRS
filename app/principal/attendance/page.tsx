// Principal attendance page (/principal/attendance) with two tabs: Mark and
// Reports. Server Component: it fetches the class/section options once, then the
// Tabs (client) host the two interactive panels. (Teachers will reach the same
// interface from their own dashboard in a later phase; the APIs already allow them.)
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkAttendance } from "@/components/attendance/mark-attendance";
import { AttendanceReport } from "@/components/attendance/attendance-report";

export default async function AttendancePage() {
  const session = await getServerSession(authOptions);
  const classes = await listClassesWithSections(session!.user.schoolId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>

      <Tabs defaultValue="mark">
        <TabsList>
          <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          <TabsTrigger value="reports">View Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="mark">
          <MarkAttendance classes={classes} />
        </TabsContent>
        <TabsContent value="reports">
          <AttendanceReport classes={classes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
