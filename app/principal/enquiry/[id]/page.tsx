// Enquiry detail (/principal/enquiry/[id]).
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnquiry } from "@/lib/enquiry";
import { EnquiryDetail } from "@/components/enquiry/enquiry-detail";

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const enquiry = await getEnquiry(params.id, session!.user.schoolId);
  if (!enquiry) notFound();

  return (
    <div className="space-y-6">
      <Link href="/principal/enquiry" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to enquiries</Link>
      <EnquiryDetail enquiry={enquiry} />
    </div>
  );
}
