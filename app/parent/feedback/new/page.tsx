// New feedback (/parent/feedback/new) — full-screen form on mobile.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export default function NewFeedbackPage() {
  return (
    <div className="space-y-4">
      <Link href="/parent/feedback" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feedback
      </Link>
      <h1 className="text-2xl font-bold">New Feedback</h1>
      <FeedbackForm />
    </div>
  );
}
