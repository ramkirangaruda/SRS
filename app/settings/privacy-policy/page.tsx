// PUBLIC privacy policy page (no auth — linked from the login footer). /settings
// is not under the auth middleware matcher, so anyone can read it.
//
// Why privacy policies matter for school apps: we handle CHILDREN'S data, which is
// specially protected — e.g. COPPA (US) requires verifiable parental consent and
// limits on collecting data from under-13s; India's DPDP Act and GDPR-K likewise
// mandate disclosure of what's collected, why, how it's stored, and parents'
// rights to access/delete. A clear, accessible policy isn't just good practice;
// it's a legal requirement for handling minors' data.
import { getLegal, firstSchoolId } from "@/lib/settings";
import { LegalPage } from "@/components/settings/legal-page";

export default async function PrivacyPolicyPage() {
  const schoolId = await firstSchoolId();
  const legal = schoolId ? await getLegal(schoolId, "privacy") : { schoolName: "School", content: "" };
  return <LegalPage title="Privacy Policy" schoolName={legal.schoolName} content={legal.content} />;
}
