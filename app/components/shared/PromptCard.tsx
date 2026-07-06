"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Trash2, Share2 } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../ui/cn";

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

  return (
    <Card className="flex flex-col overflow-hidden transition-colors hover:border-line-strong">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
            FORMAT_BADGE[prompt.format] ??
              "border-accent/30 bg-accent/10 text-accent-ink"
          )}
        >
          {FORMAT_LABEL[prompt.format] ?? prompt.format}
        </span>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-subtle">
            {new Date(prompt.created_at).toLocaleDateString()}
          </span>
          <Link
            href={`/submit?promptId=${prompt.id}`}
            aria-label="Share a result from this prompt"
            title="Share a result"
            className="text-subtle transition-colors hover:text-accent"
          >
            <Share2 className="h-4 w-4" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete prompt"
            title="Delete prompt"
            className="text-subtle transition-colors hover:text-danger disabled:text-faint"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
          Original idea
        </div>
        <p className="mb-4 line-clamp-2 text-sm text-ink">
          &quot;{prompt.core_idea}&quot;
        </p>

        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
          Generated output
        </div>
        <div className="relative">
          <div className="scrollbar-thin h-44 overflow-y-auto rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
            <ReactMarkdown>{prompt.generated_result}</ReactMarkdown>
          </div>
          {/* Fade the bottom edge to hint at more content. */}
          <div className="pointer-events-none absolute inset-x-px bottom-px h-8 rounded-b-lg bg-[linear-gradient(to_top,var(--color-surface-2),transparent)]" />
        </div>
      </div>
    </Card>
  );
}
