"use client";

import { useEffect, useState } from "react";
import { Heart, X, Copy, Check, ExternalLink } from "lucide-react";
import { parseVideoUrl } from "../../lib/embed";
import type { Submission } from "../../lib/submissions";

// Expanded view for a single submission. Because this component only mounts
// when a card is opened, the <iframe> here is what makes the player "load on
// click" rather than on gallery load.
export default function SubmissionModal({
  submission,
  liked,
  onClose,
  onToggleLike,
}: {
  submission: Submission;
  liked: boolean;
  onClose: () => void;
  onToggleLike: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const parsed = parseVideoUrl(submission.video_url);

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(submission.prompt_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-blue-400">
              {submission.platform}
            </span>
            {submission.model_version && (
              <span className="text-xs text-zinc-500">
                {submission.model_version}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video */}
        <div className="aspect-video w-full bg-black">
          {parsed ? (
            <iframe
              src={parsed.embedUrl}
              title="Community submission"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <a
              href={submission.video_url}
              target="_blank"
              rel="noreferrer"
              className="flex h-full w-full items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white"
            >
              <ExternalLink className="h-4 w-4" />
              Open video
            </a>
          )}
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Prompt
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-700"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy prompt
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-900 p-4 text-sm leading-relaxed text-zinc-200">
              {submission.prompt_text}
            </pre>
          </div>

          {/* Footer: credit + like */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
            <span className="text-sm text-zinc-400">
              {submission.submitter_url && submission.submitter_name ? (
                <>
                  Shared by{" "}
                  <a
                    href={submission.submitter_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-blue-400 hover:underline"
                  >
                    {submission.submitter_name}
                  </a>
                </>
              ) : submission.submitter_name ? (
                <>
                  Shared by{" "}
                  <span className="font-medium text-zinc-200">
                    {submission.submitter_name}
                  </span>
                </>
              ) : (
                <span className="text-zinc-600">Shared anonymously</span>
              )}
            </span>

            <button
              onClick={onToggleLike}
              aria-label={liked ? "Unlike" : "Like"}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                liked
                  ? "border-red-900/50 bg-red-950/30 text-red-400"
                  : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-red-400" : ""}`} />
              {submission.likes_count}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
