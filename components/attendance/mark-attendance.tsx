// The "Mark Attendance" tab. Picks date + class + section, batch-loads the
// roster, lets the teacher toggle statuses (defaulting to Present), and submits
// the whole class in one transactional API call.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { type AttendanceStatus } from "@/lib/attendance-status";
import { AttendanceRow } from "@/components/attendance/attendance-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Student = { id: string; name: string; admissionNumber: string; photo: string | null };

const today = () => new Date().toISOString().slice(0, 10);

export function MarkAttendance({ classes }: { classes: ClassWithSections[] }) {
  const [date, setDate] = useState(today());
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  // Controlled state for the whole form: status + note per studentId. Keeping
  // these as flat maps (not nested in the student objects) lets each row receive
  // just its own primitive value, so memoized rows don't all re-render.
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exists, setExists] = useState(false);

  const sectionOptions = classes.find((c) => c.id === classId)?.sections ?? [];
  const ready = date && classId && sectionId;

  // Batch-load the roster (one request) whenever the selection is complete.
  useEffect(() => {
    if (!ready) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/attendance/daily?date=${date}&classId=${classId}&sectionId=${sectionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setStudents(data.students);
        setStatusMap(Object.fromEntries(data.students.map((s: { id: string; status: AttendanceStatus }) => [s.id, s.status])));
        setNoteMap(Object.fromEntries(data.students.map((s: { id: string; note: string }) => [s.id, s.note ?? ""])));
        setExists(data.exists);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, classId, sectionId, ready]);

  // STABLE callbacks (empty deps) so memoized rows keep the same function
  // identity across renders and don't re-render unnecessarily.
  const handleStatusChange = useCallback((id: string, status: AttendanceStatus) => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }, []);
  const handleNoteChange = useCallback((id: string, note: string) => {
    setNoteMap((prev) => ({ ...prev, [id]: note }));
  }, []);

  function selectAllPresent() {
    setStatusMap(Object.fromEntries(students.map((s) => [s.id, "PRESENT" as AttendanceStatus])));
  }

  async function submit() {
    setSubmitting(true);
    const records = students.map((s) => ({
      studentId: s.id,
      status: statusMap[s.id] ?? "PRESENT",
      note: noteMap[s.id] ?? "",
    }));
    const res = await fetch("/api/attendance/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, classId, sectionId, records }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to mark attendance.");
      return;
    }
    const result = await res.json();
    toast.success(`Marked attendance for ${result.count} students`);
    setExists(true); // button now says "Update Attendance"
  }

  return (
    <div className="space-y-4">
      {/* Selection bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="att-date">Date</Label>
          <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select
            value={classId}
            onValueChange={(v) => {
              setClassId(v);
              setSectionId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
            <SelectTrigger>
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {sectionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Prompt / loading / roster */}
      {!ready ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Pick a date, class and section to load the student list.
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No students in this class/section.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{students.length} students</p>
            <Button variant="outline" size="sm" className="gap-2" onClick={selectAllPresent}>
              <CheckCheck className="h-4 w-4" /> Select All Present
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              {students.map((s) => (
                <AttendanceRow
                  key={s.id}
                  student={s}
                  status={statusMap[s.id] ?? "PRESENT"}
                  note={noteMap[s.id] ?? ""}
                  onStatusChange={handleStatusChange}
                  onNoteChange={handleNoteChange}
                />
              ))}
            </CardContent>
          </Card>

          {/* Sticky-ish submit. Label flips to "Update" once records exist. */}
          <div className="flex justify-end">
            <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Saving…" : exists ? "Update Attendance" : "Submit Attendance"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
