// Offline fallback. When the service worker can't fetch a page (no network) and
// has no cached copy, it serves THIS (configured as the document fallback in
// next.config.mjs). Static so it's always available offline.
export const metadata = { title: "Offline · SchoolSync" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="SchoolSync" className="h-16 w-16 rounded-xl" />
      <h1 className="text-xl font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Some features may not be available. Your data will sync when you&apos;re back online.
      </p>
    </main>
  );
}
