// Parent fee detail for one child (/parent/fees/[studentId]). Read-only: fee
// breakdown + payment history timeline. getChildFeeDetail filters by the parent's
// own id, so a parent can only ever open their own child's fees (else 404).
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getChildFeeDetail } from "@/lib/fees";
import { getInitials } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeeBreakdown } from "@/components/fees/fee-breakdown";
import { PaymentTimeline } from "@/components/fees/payment-timeline";

export default async function ParentChildFeePage({ params }: { params: { studentId: string } }) {
  const session = await getServerSession(authOptions);
  const detail = await getChildFeeDetail(params.studentId, session!.user.id, session!.user.schoolId);
  if (!detail) notFound();

  const { student } = detail;

  return (
    <div className="space-y-6">
      <Link
        href="/parent/fees"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to fees
      </Link>

      <div className="flex items-center gap-4">
        {student.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.photo} alt={student.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {getInitials(student.name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">
            #{student.admissionNumber} · Class {student.className ?? "—"}
            {student.sectionName ? ` · Section ${student.sectionName}` : ""}
          </p>
        </div>
      </div>

      <FeeBreakdown
        total={detail.total}
        paid={detail.paid}
        pending={detail.pending}
        status={detail.status}
        description={detail.feeDescription}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentTimeline payments={detail.payments} />
        </CardContent>
      </Card>
    </div>
  );
}
