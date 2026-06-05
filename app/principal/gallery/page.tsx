import { AlbumsGrid } from "@/components/gallery/albums-grid";
export default function PrincipalGalleryPage() {
  return <AlbumsGrid editable endpoint="/api/gallery" basePath="/principal/gallery" />;
}
