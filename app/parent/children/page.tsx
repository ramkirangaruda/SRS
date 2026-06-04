// Parent "My Children" page (/parent/children). Server Component. We fetch only
// THIS parent's children by filtering on their own user id — ownership is
// enforced in the query itself (listChildrenForParent), so a parent can never
// load another family's students.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listChildrenForParent } from "@/lib/students";
import { formatDate, getInitials } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyChildrenPage() {
  const session = await getServerSession(authOptions);
  const children = await listChildrenForParent(session!.user.id, session!.user.schoolId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Children</h1>
        <p className="text-sm text-muted-foreground">{children.length} linked</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No children are linked to your account yet. Please contact the school office.
          </CardContent>
        </Card>
      ) : (
        // Responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop.
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Link key={child.id} href={`/parent/children/${child.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center gap-4 p-4">
                  {child.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={child.photo}
                      alt={child.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    // Avatar fallback: initials on a colored circle.
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                      {getInitials(child.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{child.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Class {child.class?.name ?? "—"}
                      {child.section ? ` · ${child.section.name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{child.admissionNumber} · DOB {formatDate(child.dateOfBirth)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
