import { AlbumDetailView } from "@/components/gallery/album-detail-view";
export default function Page({ params }: { params: { albumId: string } }) {
  return <AlbumDetailView albumId={params.albumId} editable backPath="/principal/gallery" />;
}
