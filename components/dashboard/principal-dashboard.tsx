// Principal command center. Fetches the ONE combined endpoint and lays out:
// stat cards → action-needed widgets → today's snapshot → activity feed.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarCheck, Wallet, MessageSquare, DoorOpen, CalendarRange, Cake, UtensilsCrossed, Baby, Activity } from "lucide-react";
import { formatINR } from "@/lib/money";
import { timeAgo } from "@/lib/relative-time";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton, ErrorState } from "@/components/ui/states";

type Data = Awaited<ReturnType<typeof fetchData>>;
async function fetchData() {
  const res = await fetch("/api/dashboard/principal");
  if (!res.ok) throw new Error("failed");
  return res.json() as Promise<{
    stats: { students: number; studentsAddedThisMonth: number; attendancePct: number | null; attendanceMarked: number; feeCollected: number; feeExpected: number; feePending: number; pendingFeedback: number; visitorsOnPremises: number; upcomingEvents: number };
    followUps: { id: string; parentName: string; childName: string | null; phone: string }[];
    pendingAdmissions: { id: string; studentName: string; classAppliedFor: string; daysPending: number }[];
    lowAttendance: { studentId: string; name: string; className: string | null; pct: number }[];
    feeDefaulters: { name: string; className: string | null; pending: number }[];
    menu: string[]; birthdays: { name: string; detail: string }[];
    daycare: { total: number; checkedIn: number; notArrived: number; checkedOut: number };
    activity: { id: string; description: string; by: string | null; createdAt: string }[];
  }>;
}

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const attColor = (p: number | null) => (p == null ? "text-muted-foreground" : p >= 85 ? "text-emerald-600" : p >= 70 ? "text-amber-600" : "text-red-600");

export function PrincipalDashboard({ name, activeYear }: { name: string; activeYear: string | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  const load = () => { setError(false); fetchData().then(setData).catch(() => setError(true)); };
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState onRetry={load} />;
  if (!data) return <PageSkeleton variant="cards" />;
  const s = data.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{greeting()}, {name}</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        {activeYear && <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{activeYear}</span>}
      </div>

      {/* 6 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard href="/principal/students" icon={Users} label="Total Students" value={String(s.students)} sub={s.studentsAddedThisMonth ? `+${s.studentsAddedThisMonth} this month` : undefined} />
        <StatCard href="/principal/attendance" icon={CalendarCheck} label="Today's Attendance" value={s.attendancePct == null ? "—" : `${s.attendancePct}%`} valueClass={attColor(s.attendancePct)} sub={s.attendanceMarked ? `${s.attendanceMarked} marked` : "not marked"} />
        <StatCard href="/principal/fees" icon={Wallet} label="Fees Collected" value={formatINR(s.feeCollected)} sub={`of ${formatINR(s.feeExpected)}`} />
        <StatCard href="/principal/feedback" icon={MessageSquare} label="Pending Feedback" value={String(s.pendingFeedback)} valueClass={s.pendingFeedback > 0 ? "text-red-600" : ""} />
        <StatCard href="/principal/visitors" icon={DoorOpen} label="On Premises" value={String(s.visitorsOnPremises)} sub="visitors now" />
        <StatCard href="/principal/events" icon={CalendarRange} label="Upcoming Events" value={String(s.upcomingEvents)} sub="next 7 days" />
      </div>

      {/* Action-needed widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        <Widget title="Today's Follow-ups" href="/principal/enquiry" empty="No follow-ups due today.">
          {data.followUps.map((f) => (
            <Row key={f.id} left={`${f.parentName}${f.childName ? ` · ${f.childName}` : ""}`} right={<a href={`tel:${f.phone}`} className="text-blue-600 hover:underline">Call</a>} />
          ))}
        </Widget>
        <Widget title="Pending Admissions" href="/principal/admissions" empty="No applications waiting.">
          {data.pendingAdmissions.map((a) => (
            <Row key={a.id} left={`${a.studentName} · Class ${a.classAppliedFor}`} right={<span className="text-xs text-muted-foreground">{a.daysPending}d</span>} />
          ))}
        </Widget>
        <Widget title="Low Attendance (<75%)" href="/principal/attendance" empty="Everyone's above 75%.">
          {data.lowAttendance.map((l) => (
            <Row key={l.studentId} left={`${l.name}${l.className ? ` · ${l.className}` : ""}`} right={<span className="text-red-600">{l.pct}%</span>} />
          ))}
        </Widget>
        <Widget title="Fee Defaulters" href="/principal/fees" empty="No pending fees.">
          {data.feeDefaulters.map((d, i) => (
            <Row key={i} left={`${d.name}${d.className ? ` · ${d.className}` : ""}`} right={<span className="text-red-600">{formatINR(d.pending)}</span>} />
          ))}
        </Widget>
      </div>

      {/* Today's snapshot */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="mb-1 flex items-center gap-1 text-sm font-semibold"><UtensilsCrossed className="h-4 w-4" /> Today's Lunch</p><p className="text-sm text-muted-foreground">{data.menu.length ? data.menu.join(", ") : "Not planned"}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="mb-1 flex items-center gap-1 text-sm font-semibold"><Cake className="h-4 w-4" /> Birthdays</p>{data.birthdays.length ? <ul className="text-sm text-muted-foreground">{data.birthdays.map((b, i) => <li key={i}>🎂 {b.name} <span className="text-xs">({b.detail})</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None today</p>}</CardContent></Card>
        <Card><CardContent className="p-4"><p className="mb-1 flex items-center gap-1 text-sm font-semibold"><Baby className="h-4 w-4" /> Daycare</p>{data.daycare.total ? <p className="text-sm text-muted-foreground">{data.daycare.checkedIn} in · {data.daycare.notArrived} not arrived · {data.daycare.checkedOut} out</p> : <p className="text-sm text-muted-foreground">No daycare students</p>}</CardContent></Card>
      </div>

      {/* Activity feed */}
      <Card><CardContent className="p-4">
        <p className="mb-3 flex items-center gap-1 text-sm font-semibold"><Activity className="h-4 w-4" /> Recent Activity</p>
        {data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity.</p> : (
          <ul className="space-y-2">{data.activity.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 border-b pb-2 text-sm last:border-0">
              <span>{a.description}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
            </li>
          ))}</ul>
        )}
      </CardContent></Card>
    </div>
  );
}

function StatCard({ href, icon: Icon, label, value, sub, valueClass = "" }: { href: string; icon: typeof Users; label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <Link href={href}>
      <Card className="h-full transition hover:border-primary/50">
        <CardContent className="p-4">
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</p>
          <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function Widget({ title, href, empty, children }: { title: string; href: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const isEmpty = items.flat().filter(Boolean).length === 0;
  return (
    <Card><CardContent className="p-4">
      <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">{title}</p><Link href={href} className="text-xs text-blue-600 hover:underline">View all</Link></div>
      {isEmpty ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="space-y-1.5">{children}</div>}
    </CardContent></Card>
  );
}

function Row({ left, right }: { left: string; right: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{left}</span><span className="shrink-0">{right}</span></div>;
}
