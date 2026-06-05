// New broadcast (/principal/broadcast/new) — the compose + audience screen.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { BroadcastCompose } from "@/components/broadcast/broadcast-compose";

export default async function NewBroadcastPage() {
  const session = await getServerSession(authOptions);
  const classes = await listClassesWithSections(session!.user.schoolId);
  return (
    <div className="space-y-4">
      <Link href="/principal/broadcast" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to broadcasts
      </Link>
      <h1 className="text-2xl font-bold">New Broadcast</h1>
      <BroadcastCompose classes={classes} />
    </div>
  );
}
