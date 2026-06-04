// ONE student's marking row: avatar, name/admission, the four status toggles,
// and (when not Present) a note input.
//
// PERFORMANCE: this is wrapped in React.memo and receives only PRIMITIVES for
// its student (status, note) plus STABLE callbacks (useCallback in the parent).
// So clicking student #7's toggle re-renders ONLY row #7 — not the other 49.
// That's how a fully controlled form with 30–50 rows stays snappy.
"use client";

import { memo } from "react";
import { ATTENDANCE_STATUSES, STATUS_BG, STATUS_LABEL, type AttendanceStatus } from "@/lib/attendance-status";
import { getInitials } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type RowStudent = { id: string; name: string; admissionNumber: string; photo: string | null };

type Props = {
  student: RowStudent;
  status: AttendanceStatus;
  note: string;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
};

function AttendanceRowInner({ student, status, note, onStatusChange, onNoteChange }: Props) {
  return (
    <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      {/* Identity */}
      <div className="flex items-center gap-3">
        {student.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.photo} alt={student.name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(student.name)}
          </div>
        )}
        <div>
          <p className="font-medium leading-tight">{student.name}</p>
          <p className="text-xs text-muted-foreground">{student.admissionNumber}</p>
        </div>
      </div>

      {/* Toggles + optional note */}
      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <div className="flex flex-wrap gap-1.5">
          {ATTENDANCE_STATUSES.map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onStatusChange(student.id, s)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? STATUS_BG[s] : "bg-background hover:bg-accent"
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
        {/* A note is usually only relevant for non-present statuses. */}
        {status !== "PRESENT" && (
          <Input
            value={note}
            onChange={(e) => onNoteChange(student.id, e.target.value)}
            placeholder="Note (optional)"
            className="h-8 w-full text-xs sm:w-56"
          />
        )}
      </div>
    </div>
  );
}

// memo: skip re-render unless THIS row's props actually changed.
export const AttendanceRow = memo(AttendanceRowInner);
