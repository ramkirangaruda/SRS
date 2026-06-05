// Renders a video: an embedded iframe for YouTube/Vimeo, or an HTML5 <video> for
// direct uploads. Always 16:9, full width on mobile.
//
// IFRAME SECURITY: embedding third-party content runs THEIR code in our page, so
// we constrain it. `sandbox` whitelists only what a player needs —
// allow-scripts (the player JS), allow-same-origin (so it can talk to its own
// origin), allow-presentation (fullscreen/casting). We deliberately DON'T grant
// allow-top-navigation or allow-popups, so the embed can't hijack our tab or
// open spam windows. `allow` enables fullscreen/autoplay features.
"use client";

type V = { source: string; embedUrl: string | null; videoUrl: string; title: string };

export function VideoPlayer({ video }: { video: V }) {
  const external = video.source !== "UPLOAD" && video.embedUrl;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      {external ? (
        <iframe
          src={video.embedUrl!}
          title={video.title}
          className="absolute inset-0 h-full w-full"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={video.videoUrl} controls className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
