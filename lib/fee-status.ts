// Fee status helpers with NO database imports, so both Server Components and
// Client Components can use them (client code must never import lib/fees, which
// pulls in Prisma). Keeping the status logic here means server + client agree.

export type FeeStatus = "PAID" | "PARTIAL" | "UNPAID";

// Derive status from totals (paise). total<=0 means no fee set => nothing owed.
export function statusFor(total: number, paid: number): FeeStatus {
  if (total <= 0) return "PAID";
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIAL";
}

// Map a status to a Badge variant (green / amber / red).
export function feeStatusVariant(status: FeeStatus): "success" | "warning" | "destructive" {
  if (status === "PAID") return "success";
  if (status === "PARTIAL") return "warning";
  return "destructive";
}
