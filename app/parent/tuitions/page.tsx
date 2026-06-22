// Parent view of their children's tuition enrollments + fees (/parent/tuitions).
import { ParentTuitionsView } from "@/components/tuitions/parent-tuitions-view";

export default function ParentTuitionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tuitions</h1>
        <p className="text-muted-foreground">Your child's tuition batches and fee balance.</p>
      </div>
      <ParentTuitionsView />
    </div>
  );
}
