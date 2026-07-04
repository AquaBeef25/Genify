"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Trash2, Share2 } from "lucide-react";

export type Prompt = {
  id: string;
  format: string;
  core_idea: string;
  generated_result: string;
  created_at: string;
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
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-sm transition-all hover:border-zinc-700 hover:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
        <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          {prompt.format}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {new Date(prompt.created_at).toLocaleDateString()}
          </span>
          <Link
            href={`/submit?promptId=${prompt.id}`}
            aria-label="Share a result from this prompt"
            title="Share a result"
            className="text-zinc-500 hover:text-blue-400 transition-colors"
          >
            <Share2 className="h-4 w-4" />
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Delete prompt"
            title="Delete prompt"
            className="text-zinc-500 hover:text-red-400 disabled:text-zinc-700 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 text-sm text-zinc-300">
        <div className="mb-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Original Idea</div>
        <p className="mb-6 line-clamp-2 text-zinc-200">&quot;{prompt.core_idea}&quot;</p>

        <div className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Generated Output</div>
        <div className="h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-xs scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          <ReactMarkdown>{prompt.generated_result}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
