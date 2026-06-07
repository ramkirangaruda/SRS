// PUBLIC terms of service page (no auth — linked from the login footer).
import { getLegal, firstSchoolId } from "@/lib/settings";
import { LegalPage } from "@/components/settings/legal-page";

export default async function TermsPage() {
  const schoolId = await firstSchoolId();
  const legal = schoolId ? await getLegal(schoolId, "terms") : { schoolName: "School", content: "" };
  return <LegalPage title="Terms of Service" schoolName={legal.schoolName} content={legal.content} />;
}
