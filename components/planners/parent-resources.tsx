// Parent resources: read-only list of resources the school marked public.
"use client";

import { FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Resource = { id: string; title: string; description: string | null; fileUrl: string | null; externalUrl: string | null; type: string; subjectName: string | null; createdAt: string };

export function ParentResources({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) return <p className="text-muted-foreground">No shared resources yet.</p>;
  return (
    <div className="space-y-2">
      {resources.map((r) => (
        <Card key={r.id}><CardContent className="flex items-center gap-3 p-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium leading-tight">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.subjectName ?? "General"} · {r.type} · {formatDate(r.createdAt)}</p>
            {r.description && <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>}
          </div>
          <Button size="sm" variant="outline" asChild><a href={r.fileUrl ?? r.externalUrl ?? "#"} target="_blank"><Download className="mr-1 h-4 w-4" /> Open</a></Button>
        </CardContent></Card>
      ))}
    </div>
  );
}
