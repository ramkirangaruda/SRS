// Manage Users: searchable/filterable list with add, reset-password, and
// activate/deactivate — a central place to manage every account.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, KeyRound, Copy } from "lucide-react";
import { ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type User = { id: string; name: string; email: string; phone: string | null; role: string; isActive: boolean; lastLoginAt: string | null };
type Student = { id: string; name: string; admissionNumber: string; class: { name: string } | null };

export function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [role, setRole] = useState("ALL");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (role !== "ALL") qs.set("role", role);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/settings/users?${qs}`);
    if (res.ok) setUsers((await res.json()).data);
  }, [role, search]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function resetPw(u: User) {
    const res = await fetch(`/api/settings/users/${u.id}/reset-password`, { method: "PATCH" });
    if (!res.ok) { toast.error("Failed"); return; }
    const j = await res.json();
    toast.success(`Temp password for ${u.name}: ${j.tempPassword}`, { duration: 10000 });
    navigator.clipboard?.writeText(j.tempPassword).catch(() => {});
  }
  async function toggle(u: User) {
    const res = await fetch(`/api/settings/users/${u.id}/toggle-status`, { method: "PATCH" });
    if (!res.ok) { toast.error("Failed"); return; }
    toast.success("Updated"); load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-44"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={role} onValueChange={setRole}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All roles</SelectItem><SelectItem value={ROLES.PRINCIPAL}>Principal</SelectItem><SelectItem value={ROLES.TEACHER}>Teacher</SelectItem><SelectItem value={ROLES.PARENT}>Parent</SelectItem></SelectContent></Select>
        <Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add User</Button>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id}><CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{u.name} <Badge variant="secondary">{u.role.toLowerCase()}</Badge> {!u.isActive && <Badge variant="destructive">Inactive</Badge>}</p>
              <p className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""} · last login {u.lastLoginAt ? formatDate(u.lastLoginAt) : "never"}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => resetPw(u)}><KeyRound className="mr-1 h-4 w-4" /> Reset</Button>
            <Button size="sm" variant="outline" onClick={() => toggle(u)}>{u.isActive ? "Deactivate" : "Activate"}</Button>
          </CardContent></Card>
        ))}
        {users.length === 0 && <p className="text-sm text-muted-foreground">No users match.</p>}
      </div>

      <AddUserDialog open={addOpen} onOpenChange={setAddOpen} onSaved={load} />
    </div>
  );
}

function AddUserDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: ROLES.PARENT, password: "" });
  const [autoPw, setAutoPw] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState("");
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", email: "", phone: "", role: ROLES.PARENT, password: "" }); setAutoPw(true); setLinked(new Set()); setCreated(null); setStudentSearch("");
    fetch("/api/settings/users?students=1").then((r) => r.json()).then((j) => setStudents(j.students ?? []));
  }, [open]);

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) return toast.error("Name and email required");
    const res = await fetch("/api/settings/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, password: autoPw ? "" : form.password, studentIds: form.role === ROLES.PARENT ? Array.from(linked) : [] }) });
    if (res.status === 409) { const j = await res.json(); return toast.error(j.error); }
    if (!res.ok) return toast.error("Failed");
    const j = await res.json();
    setCreated({ email: form.email, tempPassword: j.tempPassword }); onSaved();
  }

  const filteredStudents = students.filter((s) => s.name.toLowerCase().includes(studentSearch.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {created ? (
          <>
            <DialogHeader><DialogTitle>User created</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p>Share these credentials:</p>
              <div className="rounded-md border bg-muted/40 p-3"><p>Email: {created.email}</p><p className="flex items-center gap-2">Password: <code className="rounded bg-background px-2 py-0.5 font-mono">{created.tempPassword}</code><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(created.tempPassword); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button></p></div>
            </div>
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>Add user</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Role</Label><Select value={form.role} onValueChange={(v) => set("role", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={ROLES.TEACHER}>Teacher</SelectItem><SelectItem value={ROLES.PARENT}>Parent</SelectItem></SelectContent></Select></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={autoPw} onChange={(e) => setAutoPw(e.target.checked)} className="h-4 w-4" /> Auto-generate password</label>
              {!autoPw && <div className="space-y-1"><Label className="text-xs">Password</Label><Input value={form.password} onChange={(e) => set("password", e.target.value)} /></div>}
              {form.role === ROLES.PARENT && (
                <div className="space-y-1">
                  <Label className="text-xs">Link students ({linked.size})</Label>
                  <Input placeholder="Search students…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                  <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-1">
                    {filteredStudents.map((s) => (
                      <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"><input type="checkbox" checked={linked.has(s.id)} onChange={() => setLinked((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} className="h-4 w-4" />{s.name} <span className="text-xs text-muted-foreground">{s.class?.name ?? ""}</span></label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Create</Button></DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
