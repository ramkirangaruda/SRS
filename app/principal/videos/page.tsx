import { VideosGrid } from "@/components/videos/videos-grid";
export default function PrincipalVideosPage() {
  return <VideosGrid editable endpoint="/api/videos" basePath="/principal/videos" />;
}
