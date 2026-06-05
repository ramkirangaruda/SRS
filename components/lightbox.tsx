// Reusable full-screen Lightbox: prev/next (buttons + arrow keys + swipe),
// a zoom toggle, download, caption, and close. Full-screen on every size.
//
// SWIPE: we track touchstart→touchend X delta; a horizontal drag past a
// threshold flips to the prev/next image (and ignores mostly-vertical drags so
// scrolling still works). True pinch-to-zoom needs two-pointer math; here we
// offer a tap/zoom-button toggle (documented simplification).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react";

export type LightboxImage = { url: string; caption?: string | null; downloadName?: string };

export function Lightbox({ images, index, onClose, onIndexChange }: { images: LightboxImage[]; index: number; onClose: () => void; onIndexChange: (i: number) => void }) {
  const [zoom, setZoom] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const img = images[index];

  const prev = useCallback(() => { setZoom(false); onIndexChange((index - 1 + images.length) % images.length); }, [index, images.length, onIndexChange]);
  const next = useCallback(() => { setZoom(false); onIndexChange((index + 1) % images.length); }, [index, images.length, onIndexChange]);

  // Keyboard navigation + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose, prev, next]);

  if (!img) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95">
      {/* Top bar */}
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm">{index + 1} / {images.length}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(!zoom)} className="rounded-full p-2 hover:bg-white/10" aria-label="Zoom">{zoom ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}</button>
          <a href={img.url} download={img.downloadName ?? true} className="rounded-full p-2 hover:bg-white/10" aria-label="Download"><Download className="h-5 w-5" /></a>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-auto"
        onTouchStart={(e) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const dx = e.changedTouches[0].clientX - touchStart.current.x;
          const dy = e.changedTouches[0].clientY - touchStart.current.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) (dx > 0 ? prev() : next());
          touchStart.current = null;
        }}
      >
        {/* Prev/next (desktop) */}
        {images.length > 1 && <button onClick={prev} className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"><ChevronLeft className="h-6 w-6" /></button>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.caption ?? ""} className={`max-h-full max-w-full select-none object-contain transition-transform ${zoom ? "scale-[1.8] cursor-zoom-out" : "cursor-zoom-in"}`} onClick={() => setZoom(!zoom)} />
        {images.length > 1 && <button onClick={next} className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 md:block"><ChevronRight className="h-6 w-6" /></button>}
      </div>

      {/* Caption */}
      {img.caption && <div className="p-3 text-center text-sm text-white/90">{img.caption}</div>}
    </div>
  );
}
