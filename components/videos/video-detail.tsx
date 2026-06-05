// Video player page layout: the player, details, and a related-videos sidebar
// (right on desktop, below on mobile). Server component; the delete button is a
// client child shown only for editors.
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { VideoPlayer } from "@/components/videos/video-player";
import { VideoDeleteButton } from "@/components/videos/video-delete-button";
import { formatDate } from "@/lib/format";

type Related = { id: string; title: string; thumbnailUrl: string | null; viewCount: number };
type Video = { id: string; title: string; description: string | null; source: string; embedUrl: string | null; videoUrl: string; viewCount: number; uploadedByName: string | null; createdAt: string; related: Related[] };

export function VideoDetail({ video, basePath, deletable }: { video: Video; basePath: string; deletable: boolean }) {
  return (
    <div className="space-y-4">
      <Link href={basePath} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to videos</Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <VideoPlayer video={video} />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold">{video.title}</h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Eye className="h-4 w-4" /> {video.viewCount} views · {formatDate(video.createdAt)} · {video.uploadedByName ?? "—"}</p>
            </div>
            {deletable && <VideoDeleteButton id={video.id} basePath={basePath} />}
          </div>
          {video.description && <p className="whitespace-pre-wrap text-sm">{video.description}</p>}
        </div>

        <aside className="space-y-2">
          <p className="text-sm font-semibold">Related videos</p>
          {video.related.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : video.related.map((r) => (
            <Link key={r.id} href={`${basePath}/${r.id}`} className="flex gap-2 rounded-md p-1 hover:bg-accent">
              <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded bg-muted">
                {r.thumbnailUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0"><p className="line-clamp-2 text-xs font-medium">{r.title}</p><p className="text-[11px] text-muted-foreground">{r.viewCount} views</p></div>
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
