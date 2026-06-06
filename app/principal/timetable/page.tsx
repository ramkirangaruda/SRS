// Principal timetable hub (/principal/timetable). Three tabs:
//   • Builder — assign subject+teacher to each class/section slot
//   • Teacher view — any teacher's personal grid + workload
//   • Conflicts — whole-school double-booking report
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listAcademicYears, listActiveTeachers, activeYearId } from "@/lib/timetable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableBuilder } from "@/components/timetable/timetable-builder";
import { TeacherTimetableView } from "@/components/timetable/teacher-timetable";
import { ConflictsPanel } from "@/components/timetable/conflicts-panel";

export default async function PrincipalTimetablePage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const [classes, years, teachers, yearId] = await Promise.all([
    listClassesWithSections(schoolId),
    listAcademicYears(schoolId),
    listActiveTeachers(schoolId),
    activeYearId(schoolId),
  ]);
  const defaultYearId = yearId ?? years[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">Build class timetables, view teacher schedules, and catch clashes.</p>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="teacher">Teacher View</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          <TimetableBuilder classes={classes} years={years} teachers={teachers} defaultYearId={defaultYearId} />
        </TabsContent>
        <TabsContent value="teacher">
          <TeacherTimetableView teachers={teachers} academicYearId={defaultYearId} />
        </TabsContent>
        <TabsContent value="conflicts">
          <ConflictsPanel academicYearId={defaultYearId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
