// Principal toddler roster (/principal/toddlers).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listParentsForLink } from "@/lib/toddlers";
import { ToddlersView } from "@/components/toddlers/toddlers-view";

export default async function ToddlersPage() {
  const session = await getServerSession(authOptions);
  const parents = await listParentsForLink(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Toddlers</h1>
        <p className="text-muted-foreground">The roster of your youngest children and their profiles.</p>
      </div>
      <ToddlersView parents={parents} />
    </div>
  );
}
