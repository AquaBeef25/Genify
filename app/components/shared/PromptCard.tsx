"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Trash2, Share2, Eye, X } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../ui/cn";
import { markdownComponents } from "./markdown";

export type Prompt = {
  id: string;
  format: string;
  core_idea: string;
  generated_result: string;
  created_at: string;
};

const FORMAT_LABEL: Record<string, string> = {
  tiktok: "TikTok / Reels",
  youtube: "YouTube",
  commercial: "Cinematic",
};

// Subtle per-format tint so the grid is easy to scan without shouting color.
const FORMAT_BADGE: Record<string, string> = {
  tiktok: "border-accent/30 bg-accent/10 text-accent-ink",
  youtube: "border-[#6496c8]/40 bg-[#6496c8]/12 text-[#4f7ba8]",
  commercial: "border-[#9678b4]/40 bg-[#9678b4]/12 text-[#7a5f9a]",
};

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider";

// Flatten the generated markdown into a short plain-text teaser for the card.
function toPreview(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Reusable history card. Extracted from history/page.tsx so the delete action
// has a clean home and the same card can be reused elsewhere.
export default function PromptCard({
  prompt,
  onDelete,
}: {
  prompt: Prompt;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  // Close the View modal on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleDelete = async () => {
    if (!confirm("Delete this prompt? This can't be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(prompt.id);
    } finally {
      // If deletion succeeds the card unmounts; this only matters on failure.
      setDeleting(false);
    }
  };

  const badgeClass =
    FORMAT_BADGE[prompt.format] ??
    "border-accent/30 bg-accent/10 text-accent-ink";
  const label = FORMAT_LABEL[prompt.format] ?? prompt.format;
  const date = new Date(prompt.created_at).toLocaleDateString();

  return (
    <>
      <Card className="flex flex-col overflow-hidden transition-all hover:border-accent hover:shadow-[0_4px_16px_rgba(217,119,87,0.1)]">
        {/* Header */}
        <div className="border-b border-line px-5 pb-4 pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className={cn(BADGE_BASE, badgeClass)}>{label}</span>
            <span className="text-[11px] text-subtle">{date}</span>
          </div>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
            {prompt.core_idea}
          </p>
        </div>

        {/* Preview */}
        <div className="flex-1 px-5 py-4">
          <p className="line-clamp-3 text-[13px] leading-relaxed text-muted">
            {toPreview(prompt.generated_result)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 border-t border-line px-5 py-4">
          <button
            onClick={() => setOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-xs font-semibold text-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <Link
            href={`/submit?promptId=${prompt.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2 text-xs font-semibold text-accent-ink transition hover:bg-accent/5"
          >
            <Share2 className="h-3.5 w-3.5" /> Share
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete prompt"
            title="Delete prompt"
            className="grid w-10 place-items-center rounded-lg border border-line text-subtle transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* View modal — full blueprint */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={cn(BADGE_BASE, badgeClass)}>{label}</span>
                <span className="text-xs text-subtle">{date}</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-subtle transition-colors hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                Original idea
              </div>
              <p className="mb-5 text-sm text-ink">
                &quot;{prompt.core_idea}&quot;
              </p>
              <ReactMarkdown components={markdownComponents}>
                {prompt.generated_result}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
