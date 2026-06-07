// Parent dashboard — one combined endpoint, rendered by the client component
// (skeleton while loading, error state with retry on failure).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";

export default async function ParentDashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = (session!.user.name ?? "there").split(" ")[0];
  return <ParentDashboard firstName={firstName} />;
}
