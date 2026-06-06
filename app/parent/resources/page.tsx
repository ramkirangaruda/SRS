// Parent resources (/parent/resources) — public/shared resources only.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPublicResources } from "@/lib/planners";
import { ParentResources } from "@/components/planners/parent-resources";

export default async function ParentResourcesPage() {
  const session = await getServerSession(authOptions);
  const resources = await listPublicResources(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resources</h1>
        <p className="text-muted-foreground">Learning materials shared by the school.</p>
      </div>
      <ParentResources resources={resources} />
    </div>
  );
}
