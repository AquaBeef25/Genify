"use client";

import { Heart, Play } from "lucide-react";
import { parseVideoUrl } from "../../lib/embed";
import type { Submission } from "../../lib/submissions";

// A single gallery card. The video iframe is intentionally NOT mounted here —
// we show thumbnail_url (or a placeholder) and only load the player when the
// card is opened into the modal.
export default function SubmissionCard({
  submission,
  liked,
  onOpen,
  onToggleLike,
}: {
  submission: Submission;
  liked: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
}) {
  const provider = parseVideoUrl(submission.video_url)?.provider;

  return (
    <div
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-accent hover:shadow-[0_4px_16px_rgba(217,119,87,0.1)]"
    >
      {/* Thumbnail / preview */}
      <div className="relative aspect-video w-full overflow-hidden bg-elevated">
        {submission.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={submission.thumbnail_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-faint">
            <Play className="h-10 w-10" />
          </div>
        )}

        {/* Play overlay (sits over media — stays dark for contrast) */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black">
            <Play className="h-5 w-5 translate-x-0.5 fill-current" />
          </div>
        </div>

        {/* Platform badge (over media — stays dark) */}
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
          {submission.platform}
        </span>
        {provider && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur">
            {provider}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="truncate text-xs text-muted">
          {submission.submitter_name ? (
            <>by {submission.submitter_name}</>
          ) : (
            <span className="text-faint">Anonymous</span>
          )}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLike();
          }}
          aria-label={liked ? "Unlike" : "Like"}
          className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
            liked ? "text-danger" : "text-subtle hover:text-ink"
          }`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-danger" : ""}`} />
          {submission.likes_count}
        </button>
      </div>
    </div>
  );
}
