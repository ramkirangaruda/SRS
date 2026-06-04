// A simple, reusable placeholder for sections that are navigable but not built
// yet (Staff, Settings, the teacher dashboard). It keeps nav links from 404-ing
// and clearly signals the feature is planned. Server Component — purely presentational.
import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Construction className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {description ?? "This section is coming in a later phase."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
