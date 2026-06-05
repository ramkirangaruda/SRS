// Principal meals (/principal/meals): calendar + weekly planner + copy + print.
import { MealsView } from "@/components/meals/meals-view";

export default function PrincipalMealsPage() {
  return <MealsView editable endpoint="/api/meals" />;
}
