// The staff section now lives at /principal/staff (alongside the other principal
// modules). This old path simply redirects there so any saved links still work.
import { redirect } from "next/navigation";

export default function StaffRedirect() {
  redirect("/principal/staff");
}
