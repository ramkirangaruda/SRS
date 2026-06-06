// Principal enquiry pipeline (/principal/enquiry).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listCategories } from "@/lib/enquiry";
import { EnquiryView } from "@/components/enquiry/enquiry-view";

export default async function EnquiryPage() {
  const session = await getServerSession(authOptions);
  const categories = await listCategories(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enquiries</h1>
        <p className="text-muted-foreground">Track leads from first contact to admission.</p>
      </div>
      <EnquiryView categories={categories} />
    </div>
  );
}
