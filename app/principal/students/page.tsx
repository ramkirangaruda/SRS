// The principal's Students page (/principal/students). A Server Component: it
// reads the URL filters, fetches the matching page of data on the server, then
// hands everything to the <StudentsView> Client Component for interactivity.
//
// `searchParams` is provided by Next.js from the query string. Reading it here
// (server-side) means the very first render already has the right data — no
// loading spinner, no client round-trip.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listStudents,
  listClassesWithSections,
  listParents,
} from "@/lib/students";
import { StudentsView } from "@/components/students/students-view";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { search?: string; classId?: string; sectionId?: string; page?: string };
}) {
  // The layout already guarantees a principal, but we need the schoolId to scope
  // queries, so we read the session here too.
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const search = searchParams.search ?? "";
  const classId = searchParams.classId ?? "";
  const sectionId = searchParams.sectionId ?? "";
  const page = Number(searchParams.page ?? 1);

  // Fetch in parallel: the page of students, the class/section options, and the
  // parent list for the form's "existing parent" picker.
  const [result, classes, parents] = await Promise.all([
    listStudents({ schoolId, search, classId, sectionId, page, pageSize: 10 }),
    listClassesWithSections(schoolId),
    listParents(schoolId),
  ]);

  return (
    <StudentsView
      students={result.data}
      classes={classes}
      parents={parents}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{ search, classId, sectionId }}
    />
  );
}
