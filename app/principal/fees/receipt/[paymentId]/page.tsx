// Printable payment receipt (/principal/fees/receipt/[paymentId]). The app chrome
// is hidden on print (print:hidden on the shell), so only this receipt prints.
// The PrintTrigger auto-opens the print dialog; "Save as PDF" downloads it.
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPaymentReceipt } from "@/lib/fees";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PrintTrigger } from "@/components/fees/print-trigger";

export default async function ReceiptPage({ params }: { params: { paymentId: string } }) {
  const session = await getServerSession(authOptions);
  const r = await getPaymentReceipt(params.paymentId, session!.user.schoolId);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex justify-end">
        <PrintTrigger />
      </div>

      {/* The receipt itself. Bordered card prints nicely on A4. */}
      <div className="rounded-lg border p-8">
        {/* School header */}
        <div className="border-b pb-4 text-center">
          <h1 className="text-xl font-bold">{r.school.name}</h1>
          {r.school.address && <p className="text-sm text-muted-foreground">{r.school.address}</p>}
          <p className="text-sm text-muted-foreground">
            {[r.school.phone, r.school.email].filter(Boolean).join(" · ")}
          </p>
        </div>

        <h2 className="my-4 text-center text-lg font-semibold">Fee Payment Receipt</h2>

        <div className="space-y-2 text-sm">
          <Row label="Receipt No." value={r.receiptNumber} />
          <Row label="Date" value={formatDate(r.date)} />
          <Row label="Student" value={r.student.name} />
          <Row label="Admission No." value={r.student.admissionNumber} />
          <Row
            label="Class"
            value={`${r.student.class?.name ?? "—"}${r.student.section ? ` · ${r.student.section.name}` : ""}`}
          />
          <Row label="Payment Mode" value={r.mode} />
          {r.notes && <Row label="Notes" value={r.notes} />}
          <Row label="Collected By" value={r.collectedBy?.name ?? "—"} />
        </div>

        {/* Amount, emphasized */}
        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <span className="font-semibold">Amount Paid</span>
          <span className="text-xl font-bold">{formatINR(r.amount)}</span>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This is a computer-generated receipt.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
