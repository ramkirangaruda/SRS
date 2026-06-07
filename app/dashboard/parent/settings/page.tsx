// Parent Settings — the SettingsView shows only the parent-relevant sections.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsView } from "@/components/settings/settings-view";

export default async function ParentSettingsPage() {
  const session = await getServerSession(authOptions);
  const [user, school] = await Promise.all([
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { locale: true } }),
    prisma.school.findUnique({ where: { id: session!.user.schoolId }, select: { name: true } }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>
      <SettingsView role={session!.user.role} locale={user?.locale ?? "en"} schoolName={school?.name ?? "School"} />
    </div>
  );
}
