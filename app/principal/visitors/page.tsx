// Principal visitors register (/principal/visitors).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listHosts } from "@/lib/visitors";
import { VisitorsView } from "@/components/visitors/visitors-view";

export default async function VisitorsPage() {
  const session = await getServerSession(authOptions);
  const hosts = await listHosts(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visitors Register</h1>
        <p className="text-muted-foreground">Sign visitors in and out, and review the log.</p>
      </div>
      <VisitorsView hosts={hosts} />
    </div>
  );
}
