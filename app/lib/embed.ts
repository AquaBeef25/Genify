// Parses & validates externally-hosted video links for the community gallery.
//
// We only accept links we can safely embed as a lazy <iframe> (thumbnail ->
// click -> player). Anything else returns null, which is what both the submit
// form (client-side UX) and the /api/submissions route (server-side guard) use
// to reject a submission. Keep this file dependency-free so it runs in the
// browser and in a route handler unchanged.

export type VideoProvider = "youtube" | "vimeo";

export type ParsedVideo = {
  provider: VideoProvider;
  id: string;
  // Ready-to-use embed URL for an <iframe src>.
  embedUrl: string;
  // Present for YouTube (derived from the id). For Vimeo the thumbnail needs an
  // oEmbed lookup, so the server fills it in; here it stays undefined.
  thumbnailUrl?: string;
};

// YouTube ids are always 11 url-safe base64 chars.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function stripWww(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function parseYouTube(u: URL): ParsedVideo | null {
  const host = stripWww(u.hostname);
  const segments = u.pathname.split("/").filter(Boolean);

  let id: string | null = null;

  if (host === "youtu.be") {
    // https://youtu.be/<id>
    id = segments[0] ?? null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (segments[0] === "watch") {
      // https://www.youtube.com/watch?v=<id>
      id = u.searchParams.get("v");
    } else if (["embed", "shorts", "v", "live"].includes(segments[0])) {
      // /embed/<id>, /shorts/<id>, /v/<id>, /live/<id>
      id = segments[1] ?? null;
    }
  } else {
    return null;
  }

  if (!id || !YOUTUBE_ID.test(id)) return null;

  return {
    provider: "youtube",
    id,
    embedUrl: `https://www.youtube.com/embed/${id}`,
    thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

function parseVimeo(u: URL): ParsedVideo | null {
  const host = stripWww(u.hostname);
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  const segments = u.pathname.split("/").filter(Boolean);
  // The numeric video id can sit anywhere in the path
  // (vimeo.com/<id>, vimeo.com/channels/foo/<id>, player.vimeo.com/video/<id>).
  const idIndex = segments.findIndex((s) => /^\d+$/.test(s));
  if (idIndex === -1) return null;
  const id = segments[idIndex];

  // Unlisted videos carry a private hash, either as vimeo.com/<id>/<hash>
  // or as a ?h=<hash> query param. The player embed needs it to load.
  const hash =
    u.searchParams.get("h") ||
    (segments[idIndex + 1] && /^[A-Za-z0-9]+$/.test(segments[idIndex + 1])
      ? segments[idIndex + 1]
      : null);

  const embedUrl = hash
    ? `https://player.vimeo.com/video/${id}?h=${hash}`
    : `https://player.vimeo.com/video/${id}`;

  return { provider: "vimeo", id, embedUrl };
}

// Returns parsed embed info for an allowed host, or null if the URL is invalid
// or from an unsupported source.
export function parseVideoUrl(rawUrl: string): ParsedVideo | null {
  const trimmed = rawUrl?.trim();
  if (!trimmed) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  return parseYouTube(u) ?? parseVimeo(u);
}

// Convenience guard for the submit form.
export function isAllowedVideoUrl(rawUrl: string): boolean {
  return parseVideoUrl(rawUrl) !== null;
}
