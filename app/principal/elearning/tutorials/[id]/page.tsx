// Tutorial detail: embedded content based on type.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, ExternalLink, Download } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getTutorial } from "@/lib/elearning";
import { VideoPlayer } from "@/components/videos/video-player";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function TutorialDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const t = await getTutorial(params.id, session!.user.schoolId);
  if (!t) notFound();

  return (
    <div className="space-y-4">
      <Link href="/principal/elearning" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to e-learning</Link>
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">{t.categoryName && <Badge variant="secondary">{t.categoryName}</Badge>}{t.className && <span>{t.className}</span>}<span>· {t.uploadedByName}</span></div>
      </div>
      {t.description && <p className="whitespace-pre-wrap text-sm">{t.description}</p>}

      {t.type === "VIDEO" && t.embedUrl && <VideoPlayer video={{ source: "YOUTUBE", embedUrl: t.embedUrl, videoUrl: t.videoUrl ?? "", title: t.title }} />}
      {t.type === "DOCUMENT" && t.fileUrl && (
        <Card><CardContent className="p-4"><a href={t.fileUrl} download className="flex items-center gap-2 text-blue-600 hover:underline"><Download className="h-5 w-5" /> Download document</a></CardContent></Card>
      )}
      {t.type === "LINK" && t.linkUrl && (
        <Card><CardContent className="p-4"><a href={t.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><ExternalLink className="h-5 w-5" /> Open link</a></CardContent></Card>
      )}
    </div>
  );
}
