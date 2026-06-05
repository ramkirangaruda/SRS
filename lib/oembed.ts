// oEmbed utility. WHAT oEMBED IS: a tiny standard where a provider (YouTube,
// Vimeo) exposes a JSON endpoint that, given a content URL, returns metadata —
// title, thumbnail, author, and embeddable HTML. We hit it server-side (avoids
// browser CORS), pull out the title + thumbnail, and compute the iframe embed
// URL. So a teacher pastes a normal YouTube link and we auto-fill the rest.
export type OembedResult = {
  source: "YOUTUBE" | "VIMEO";
  title: string;
  thumbnail: string | null;
  embedUrl: string;
  videoUrl: string;
};

// Extract the 11-char video id from any common YouTube URL shape.
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export async function fetchOembed(url: string): Promise<OembedResult | null> {
  const yt = youtubeId(url);
  if (yt) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      const j = res.ok ? await res.json() : {};
      return {
        source: "YOUTUBE",
        title: j.title ?? "YouTube video",
        thumbnail: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${yt}`,
        videoUrl: url,
      };
    } catch {
      // Even if oEmbed is unreachable, we can still embed by id.
      return { source: "YOUTUBE", title: "YouTube video", thumbnail: `https://img.youtube.com/vi/${yt}/hqdefault.jpg`, embedUrl: `https://www.youtube.com/embed/${yt}`, videoUrl: url };
    }
  }

  if (/vimeo\.com/.test(url)) {
    try {
      const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if (!res.ok) return null;
      const j = await res.json();
      return { source: "VIMEO", title: j.title ?? "Vimeo video", thumbnail: j.thumbnail_url ?? null, embedUrl: `https://player.vimeo.com/video/${j.video_id}`, videoUrl: url };
    } catch {
      return null;
    }
  }

  return null;
}
