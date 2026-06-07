// Parent dashboard. Child selector (if multiple) → today's overview → quick-access
// grid → upcoming → birthday banner with a tiny CSS-only confetti.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, BookOpen, Wallet, NotebookPen, Mail, CalendarClock, FileBarChart2, Images, Library, Baby } from "lucide-react";
import { getInitials, formatDate } from "@/lib/format";
import { formatINR } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

type Child = { id: string; name: string; photo: string | null; admissionNumber: string; className: string | null; sectionName: string | null };
type Data = {
  children: Child[];
  selected: { id: string; name: string; className: string | null; sectionName: string | null; isDaycare: boolean; isBirthday: boolean } | null;
  today: { attendance: { status: string; at: string } | null; homeworkCount: number; nextHomeworkDue: string | null; feePending: number };
  unread: { broadcasts: number };
  upcoming: { id: string; title: string; date: string }[];
  classmateBirthdays: string[];
};

const TILES = [
  { href: "/parent/attendance", icon: CalendarCheck, label: "Attendance" },
  { href: "/parent/homework", icon: BookOpen, label: "Homework", badge: "homework" },
  { href: "/parent/fees", icon: Wallet, label: "Fees" },
  { href: "/parent/diary", icon: NotebookPen, label: "Diary" },
  { href: "/parent/messages", icon: Mail, label: "Messages", badge: "messages" },
  { href: "/parent/timetable", icon: CalendarClock, label: "Timetable" },
  { href: "/parent/test-reports", icon: FileBarChart2, label: "Test Reports" },
  { href: "/parent/gallery", icon: Images, label: "Gallery" },
  { href: "/parent/elearning", icon: Library, label: "Learning" },
] as const;

export function ParentDashboard({ firstName }: { firstName: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  const [childId, setChildId] = useState<string | undefined>();

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/dashboard/parent${childId ? `?studentId=${childId}` : ""}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { setError(true); }
  }, [childId]);
  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorState onRetry={load} />;
  if (!data) return <PageSkeleton variant="cards" />;
  if (!data.selected) return <Card><CardContent className="p-8 text-center text-muted-foreground">No children are linked to your account yet.</CardContent></Card>;

  const sel = data.selected;
  const badges: Record<string, number> = { homework: data.today.homeworkCount, messages: data.unread.broadcasts };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>

      {/* Child selector / header */}
      {data.children.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.children.map((c) => (
            <button key={c.id} onClick={() => setChildId(c.id)} className={cn("flex shrink-0 items-center gap-2 rounded-lg border p-2 pr-3", sel.id === c.id ? "border-primary bg-primary/5" : "")}>
              {c.photo ? <img src={c.photo} alt={c.name} className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{getInitials(c.name)}</span>}
              <span className="text-left"><span className="block text-sm font-medium">{c.name}</span><span className="block text-xs text-muted-foreground">{c.className}{c.sectionName ? `-${c.sectionName}` : ""}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{sel.name} · {sel.className}{sel.sectionName ? `-${sel.sectionName}` : ""}</p>
      )}

      {/* Birthday banner */}
      {sel.isBirthday && <BirthdayBanner name={sel.name} />}

      {/* Today's overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Today's Attendance</p>
          <p className="mt-1 text-lg font-bold">{data.today.attendance ? data.today.attendance.status : "Not marked"}</p>
          {data.today.attendance && <p className="text-xs text-muted-foreground">at {new Date(data.today.attendance.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Active Homework</p>
          <p className="mt-1 text-lg font-bold">{data.today.homeworkCount}</p>
          {data.today.nextHomeworkDue && <p className="text-xs text-muted-foreground">due {formatDate(data.today.nextHomeworkDue)}</p>}
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Fee Status</p>
          <p className={cn("mt-1 text-lg font-bold", data.today.feePending > 0 ? "text-red-600" : "text-emerald-600")}>{data.today.feePending > 0 ? formatINR(data.today.feePending) : "Cleared"}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Daycare</p>
          <p className="mt-1 text-lg font-bold">{sel.isDaycare ? "Enrolled" : "—"}</p>
          {sel.isDaycare && <Link href="/parent/daycare" className="text-xs text-blue-600 hover:underline">View</Link>}
        </CardContent></Card>
      </div>

      {/* Quick access grid */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Quick access</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {TILES.map((t) => {
            const Icon = t.icon;
            const badge = "badge" in t && t.badge ? badges[t.badge] : 0;
            return (
              <Link key={t.href} href={t.href} className="relative flex flex-col items-center gap-2 rounded-lg border p-4 transition hover:border-primary/50 hover:bg-muted/40">
                {badge > 0 && <span className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{badge}</span>}
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-center text-xs font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Classmate birthdays */}
      {data.classmateBirthdays.length > 0 && (
        <Card><CardContent className="p-3 text-sm">🎂 Today's birthdays in class: <span className="font-medium">{data.classmateBirthdays.join(", ")}</span></CardContent></Card>
      )}

      {/* Upcoming */}
      <div>
        <h2 className="mb-2 text-sm font-semibold">Upcoming</h2>
        {data.upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Nothing scheduled soon.</p> : (
          <div className="space-y-2">
            {data.upcoming.map((e) => (
              <Card key={e.id}><CardContent className="flex items-center justify-between gap-2 p-3 text-sm"><span>{e.title}</span><span className="text-xs text-muted-foreground">{formatDate(e.date)}</span></CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// CSS-only confetti: a handful of absolutely-positioned squares that fall + spin
// via a keyframe (defined in globals.css). Pure CSS, no library.
function BirthdayBanner({ name }: { name: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 p-6 text-center text-white">
      {Array.from({ length: 16 }).map((_, i) => (
        <span key={i} className="confetti" style={{ left: `${(i * 6.5) % 100}%`, animationDelay: `${(i % 8) * 0.25}s`, backgroundColor: ["#fde047", "#fb7185", "#34d399", "#60a5fa"][i % 4] }} />
      ))}
      <p className="relative text-xl font-bold">🎉 Happy Birthday, {name}! 🎂</p>
    </div>
  );
}
