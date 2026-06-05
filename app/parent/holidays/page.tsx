// Parent holidays (/parent/holidays): read-only, with Next Holiday countdown +
// year-at-a-glance. Holidays are school-wide, so it's the same data.
import { HolidaysView } from "@/components/holidays/holidays-view";

export default function ParentHolidaysPage() {
  return <HolidaysView editable={false} />;
}
