// Parent fee overview (/parent/fees). One card per child with a circular progress
// ring + a "Pay Now" button (Razorpay online payment). Ownership is enforced by
// getChildrenFees(parentId).
import Link from "next/link";
import Script from "next/script";
import { getServerSession } from "next-auth";
import { AlertCircle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getChildrenFees } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { formatINR, percent } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import { CircularProgress } from "@/components/fees/circular-progress";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import { PayNowButton } from "@/components/fees/pay-now-button";

export default async function ParentFeesPage() {
  const session = await getServerSession(authOptions);
  const [children, school, me] = await Promise.all([
    getChildrenFees(session!.user.id, session!.user.schoolId),
    prisma.school.findUnique({ where: { id: session!.user.schoolId }, select: { name: true, logo: true } }),
    prisma.user.findUnique({ where: { id: session!.user.id }, select: { email: true, phone: true } }),
  ]);

  const totalPending = children.reduce((s, c) => s + c.pending, 0);

  return (
    <div className="space-y-4">
      {/* Razorpay Checkout script — loads once; PayNowButton uses window.Razorpay. */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <h1 className="text-2xl font-bold">Fees</h1>

      {/* Gentle reminder banner when something is due. */}
      {totalPending > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            You have a pending balance of <span className="font-semibold">{formatINR(totalPending)}</span>.
            Please clear it at your earliest convenience.
          </p>
        </div>
      )}

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No children are linked to your account yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-3 p-4">
                {/* The info area links to the detailed history; the Pay button below
                    is a separate action (so tapping it doesn't navigate away). */}
                <Link href={`/parent/fees/${c.id}`} className="flex items-center gap-4 rounded-md transition-colors hover:bg-accent">
                  <CircularProgress value={percent(c.paid, c.total)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{c.name}</p>
                      <FeeStatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Class {c.className ?? "—"}{c.sectionName ? ` · ${c.sectionName}` : ""}
                    </p>
                    <div className="mt-2 text-sm">
                      <p>Total: {formatINR(c.total)}</p>
                      <p className="text-green-700">Paid: {formatINR(c.paid)}</p>
                      <p className={c.pending > 0 ? "text-red-700" : "text-green-700"}>Pending: {formatINR(c.pending)}</p>
                    </div>
                  </div>
                </Link>

                <PayNowButton
                  studentId={c.id}
                  studentName={c.name}
                  pending={c.pending}
                  schoolName={school?.name ?? "School"}
                  schoolLogo={school?.logo ?? null}
                  parentEmail={me?.email ?? null}
                  parentPhone={me?.phone ?? null}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
