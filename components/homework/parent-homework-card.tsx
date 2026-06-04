// A parent's homework card (read-only, links to detail). Full-width with a large
// tap target for mobile. "Current" cards show the due-date countdown; "Past"
// cards get a muted "Completed" treatment instead.
import Link from "next/link";
import { Paperclip, CheckCircle2 } from "lucide-react";
import type { HomeworkItem } from "@/lib/homework";
import { DueBadge } from "@/components/homework/due-badge";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export function ParentHomeworkCard({ hw, past = false }: { hw: HomeworkItem; past?: boolean }) {
  return (
    <Link href={`/parent/homework/${hw.id}`}>
      <Card className={`transition-colors hover:bg-accent ${past ? "opacity-70" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold">{hw.title}</p>
              <p className="text-sm text-muted-foreground">
                {hw.subjectName ?? "General"} · By {hw.assignedByName ?? "—"}
              </p>
            </div>
            {past ? (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </span>
            ) : (
              <DueBadge dueDate={hw.dueDate} />
            )}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>Due {formatDate(hw.dueDate)}</span>
            {hw.attachments.length > 0 && (
              <span className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" /> {hw.attachments.length}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
