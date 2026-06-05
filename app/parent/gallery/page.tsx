import { AlbumsGrid } from "@/components/gallery/albums-grid";
export default function ParentGalleryPage() {
  return <AlbumsGrid editable={false} endpoint="/api/parent/gallery" basePath="/parent/gallery" />;
}
