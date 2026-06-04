// The interactive students screen for principals. Server data comes in as props;
// this Client Component handles the search box, filters, Add button, pagination,
// and switches between a desktop table and a mobile card list.
//
// State lives in the URL (?search=&classId=&sectionId=&page=). That means filters
// survive refresh/sharing, and changing one just navigates — the server re-runs
// listStudents() and streams back the new page. The URL is our state store.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { ClassWithSections, StudentWithRelations } from "@/lib/students";
import { DataTable } from "@/components/ui/data-table";
import { studentColumns } from "@/components/students/student-columns";
import { StudentForm } from "@/components/students/student-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

type ParentOption = { id: string; name: string; email: string };

type StudentsViewProps = {
  students: StudentWithRelations[];
  classes: ClassWithSections[];
  parents: ParentOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: { search: string; classId: string; sectionId: string };
};

// Sentinel for "no filter" in a Select (Radix items can't use an empty value).
const ALL = "all";

export function StudentsView({
  students,
  classes,
  parents,
  total,
  page,
  pageSize,
  totalPages,
  filters,
}: StudentsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [searchText, setSearchText] = useState(filters.search);

  // Update one or more URL params, then navigate. Changing a filter resets to
  // page 1 (you don't want to land on page 5 of a freshly filtered list).
  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === ALL) params.delete(key);
      else params.set(key, value);
    }
    if (resetPage) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce the search box: wait until the user stops typing for 400ms before
  // updating the URL, so we don't fire a query on every keystroke.
  useEffect(() => {
    if (searchText === filters.search) return; // no change → skip
    const t = setTimeout(() => updateParams({ search: searchText }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  const sectionOptions = classes.find((c) => c.id === filters.classId)?.sections ?? [];

  function goToStudent(id: string) {
    router.push(`/principal/students/${id}`);
  }

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Student</span>
        </Button>
      </div>

      {/* Search + filters: stack on mobile, row on desktop */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or admission number…"
            className="pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <Select
          value={filters.classId || ALL}
          onValueChange={(v) => updateParams({ classId: v, sectionId: null })}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sectionId || ALL}
          onValueChange={(v) => updateParams({ sectionId: v })}
          disabled={!filters.classId || sectionOptions.length === 0}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            {sectionOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DESKTOP: full data table (hidden on small screens) */}
      <div className="hidden md:block">
        <DataTable columns={studentColumns} data={students} onRowClick={(s) => goToStudent(s.id)} />
      </div>

      {/* MOBILE: card list (hidden on md and up) */}
      <div className="space-y-2 md:hidden">
        {students.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No students found.
            </CardContent>
          </Card>
        ) : (
          students.map((s) => (
            <Card
              key={s.id}
              onClick={() => goToStudent(s.id)}
              className="cursor-pointer active:bg-accent"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.admissionNumber}</span>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Class {s.class?.name ?? "—"}
                  {s.section ? ` · Section ${s.section.name}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Parent: {s.parent?.name ?? "—"}
                  {s.parent?.phone ? ` · ${s.parent.phone}` : ""}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  DOB: {formatDate(s.dateOfBirth)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParams({ page: String(page - 1) }, false)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => updateParams({ page: String(page + 1) }, false)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* The Add Student modal form (rendered once, toggled by the button) */}
      <StudentForm
        mode="create"
        open={formOpen}
        onOpenChange={setFormOpen}
        classes={classes}
        parents={parents}
      />
    </div>
  );
}
