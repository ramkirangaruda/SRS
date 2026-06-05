"use client";
import { useState } from "react";
import type { ClassWithSections } from "@/lib/students";
import { GenerateWorkflow } from "@/components/progress-reports/generate-workflow";
import { ReportsList } from "@/components/progress-reports/reports-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function ProgressReportsTabs({ classes, years }: { classes: ClassWithSections[]; years: { id: string; name: string }[] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress Reports</h1>
      <Tabs defaultValue="generate">
        <TabsList><TabsTrigger value="generate">Generate</TabsTrigger><TabsTrigger value="manage">Manage</TabsTrigger></TabsList>
        <TabsContent value="generate" className="pt-3"><GenerateWorkflow classes={classes} years={years} onGenerated={() => setRefreshKey((k) => k + 1)} /></TabsContent>
        <TabsContent value="manage" className="pt-3"><ReportsList refreshKey={refreshKey} /></TabsContent>
      </Tabs>
    </div>
  );
}
