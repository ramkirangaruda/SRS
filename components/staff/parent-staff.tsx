// Parent-facing teacher directory. Read-only. Contact details appear only when
// the school enabled them (the server already stripped them otherwise).
import { Mail, Phone } from "lucide-react";
import { getInitials } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

type Teacher = { id: string; name: string; designation: string | null; department: string | null; qualification: string | null; photo: string | null; email: string | null; phone: string | null };

export function ParentStaff({ staff, showContact }: { staff: Teacher[]; showContact: boolean }) {
  if (staff.length === 0) return <p className="text-muted-foreground">No teachers to show.</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map((t) => (
        <Card key={t.id}>
          <CardContent className="flex items-center gap-3 p-4">
            {t.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.photo} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{getInitials(t.name)}</div>
            )}
            <div className="min-w-0">
              <p className="font-medium leading-tight">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.department ?? "Teacher"}{t.qualification ? ` · ${t.qualification}` : ""}</p>
              {showContact && (
                <div className="mt-1 space-y-0.5 text-xs">
                  {t.email && <a href={`mailto:${t.email}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Mail className="h-3 w-3" /> {t.email}</a>}
                  {t.phone && <a href={`tel:${t.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline"><Phone className="h-3 w-3" /> {t.phone}</a>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
