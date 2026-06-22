// Parent view of their own toddler(s) (/parent/toddlers). Read-only.
import { ParentToddlersView } from "@/components/toddlers/parent-toddlers-view";

export default function ParentToddlersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Toddler</h1>
        <p className="text-muted-foreground">Your child's profile on file with the school.</p>
      </div>
      <ParentToddlersView />
    </div>
  );
}
