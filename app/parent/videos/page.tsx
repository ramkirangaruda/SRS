import { VideosGrid } from "@/components/videos/videos-grid";
export default function ParentVideosPage() {
  return <VideosGrid editable={false} endpoint="/api/parent/videos" basePath="/parent/videos" />;
}
