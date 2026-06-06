// Pure, client-safe helpers for meeting links (no DB imports — safe to import in
// client components). Used by both the zod validation and the parent UI.

// Zoom: https://zoom.us/j/123…  or  https://us02web.zoom.us/j/123…  (also /my, /s)
const ZOOM_RE = /^https?:\/\/([a-z0-9-]+\.)?zoom\.us\/(j\/(\d+)|my\/[\w.-]+|s\/\d+)/i;
// Google Meet: https://meet.google.com/abc-defg-hij
const MEET_RE = /^https?:\/\/meet\.google\.com\/[a-z]{3,}-?[a-z0-9-]+/i;

export function isValidMeetingLink(url: string): boolean {
  return ZOOM_RE.test(url) || MEET_RE.test(url);
}

export function meetingProvider(url: string): "zoom" | "meet" | "other" {
  if (ZOOM_RE.test(url)) return "zoom";
  if (MEET_RE.test(url)) return "meet";
  return "other";
}

// DEEP LINK: a URL that opens the NATIVE app instead of the browser, if it's
// installed. Zoom registers the `zoommtg://` scheme; tapping it on a phone with
// the Zoom app jumps straight into the meeting. Google Meet doesn't expose a
// reliable custom scheme, so we fall back to the normal https link (which the
// Meet app intercepts on Android anyway). Returns null if we can't build one.
export function appDeepLink(url: string): string | null {
  const m = url.match(ZOOM_RE);
  if (m && m[3]) {
    // m[3] is the numeric meeting id from the /j/<id> form.
    return `zoommtg://zoom.us/join?confno=${m[3]}`;
  }
  return null;
}
