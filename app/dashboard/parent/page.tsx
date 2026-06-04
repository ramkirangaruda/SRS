// The PARENT dashboard ("/dashboard/parent"). Shows the logged-in parent's own
// children — and ONLY their children, by filtering on their user id.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ParentDashboard() {
  const session = await getServerSession(authOptions);

  // Fetch children belonging to THIS parent. Scoping by session.user.id is what
  // keeps one parent from ever seeing another's children. We `include` the class
  // and section relations so we can show where each child is enrolled.
  const children = session?.user?.id
    ? await prisma.student.findMany({
        where: { parentId: session.user.id },
        include: { class: true, section: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session?.user?.name}.</p>
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
