// Change Password section. Shows a live strength meter and, on success, refreshes
// THIS device's session token (so we stay logged in) while other devices are
// invalidated server-side via passwordChangedAt.
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// PASSWORD STRENGTH ≈ ENTROPY. Entropy ~ length × log2(alphabet size): a longer
// password AND a bigger character pool (lower+upper+digits+symbols) each raise the
// number of guesses an attacker needs. So we score on BOTH length and variety,
// not length alone — "aaaaaaaa" is long but trivially guessable.
function scorePassword(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  let bits = 0;
  if (/[a-z]/.test(pw)) bits += 26;
  if (/[A-Z]/.test(pw)) bits += 26;
  if (/\d/.test(pw)) bits += 10;
  if (/[^A-Za-z0-9]/.test(pw)) bits += 30;
  const entropy = pw.length * Math.log2(bits || 1); // rough bits of entropy
  if (pw.length < 8 || entropy < 28) return { score: 1, label: "weak", color: "bg-red-500" };
  if (entropy < 50) return { score: 2, label: "fair", color: "bg-amber-500" };
  return { score: 3, label: "strong", color: "bg-emerald-500" };
}

export function AccountSection() {
  const t = useTranslations("settings.password");
  const { update } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const strength = scorePassword(next);

  async function submit() {
    if (next !== confirm) return toast.error(t("mismatch"));
    setBusy(true);
    const res = await fetch("/api/settings/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm }) });
    setBusy(false);
    if (!res.ok) { const j = await res.json(); return toast.error(j.error ?? "Failed"); }
    // Re-stamp THIS device's token so we stay logged in; other devices are out.
    await update();
    setCurrent(""); setNext(""); setConfirm("");
    toast.success(t("changed"));
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="space-y-1"><Label className="text-xs">{t("current")}</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
      <div className="space-y-1">
        <Label className="text-xs">{t("new")}</Label>
        <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        {next && (
          <div className="space-y-1 pt-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => <div key={i} className={`h-1.5 flex-1 rounded ${i <= strength.score ? strength.color : "bg-muted"}`} />)}
            </div>
            <p className="text-xs text-muted-foreground">{t("strength")}: <span className="font-medium capitalize">{t(strength.label)}</span> · 8+ chars with upper, lower & a number</p>
          </div>
        )}
      </div>
      <div className="space-y-1"><Label className="text-xs">{t("confirm")}</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
      <Button onClick={submit} disabled={busy || !current || !next}>{busy ? "Saving…" : "Change password"}</Button>
    </div>
  );
}
