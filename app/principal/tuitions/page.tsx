// Principal tuitions manager (/principal/tuitions).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTutors, listEnrollableStudents } from "@/lib/tuitions";
import { TuitionsView } from "@/components/tuitions/tuitions-view";

export default async function TuitionsPage() {
  const session = await getServerSession(authOptions);
  const [tutors, students] = await Promise.all([
    listTutors(session!.user.schoolId),
    listEnrollableStudents(session!.user.schoolId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tuitions</h1>
        <p className="text-muted-foreground">Run tuition batches, enroll students, and track fees.</p>
      </div>
      <TuitionsView tutors={tutors} students={students} />
    </div>
  );
}
