"use client";

import { useMemo } from "react";
import { Trophy, Heart } from "lucide-react";
import type { Submission } from "../../lib/submissions";

type Contributor = {
  userId: string;
  name: string;
  url: string | null;
  count: number;
  totalLikes: number;
};

// Ranks contributors from the already-fetched approved submissions, so the
// leaderboard needs no extra query. Move this to a Postgres view/RPC if the
// gallery ever paginates instead of loading all approved rows.
export default function Leaderboard({
  submissions,
}: {
  submissions: Submission[];
}) {
  const top = useMemo<Contributor[]>(() => {
    const byUser = new Map<string, Contributor>();
    for (const s of submissions) {
      const existing = byUser.get(s.user_id);
      if (existing) {
        existing.count += 1;
        existing.totalLikes += s.likes_count;
        if (!existing.url && s.submitter_url) existing.url = s.submitter_url;
      } else {
        byUser.set(s.user_id, {
          userId: s.user_id,
          name: s.submitter_name || "Anonymous",
          url: s.submitter_url,
          count: 1,
          totalLikes: s.likes_count,
        });
      }
    }
    return [...byUser.values()]
      .sort((a, b) => b.totalLikes - a.totalLikes || b.count - a.count)
      .slice(0, 8);
  }, [submissions]);

  if (top.length === 0) return null;

  const medal = ["text-yellow-500", "text-subtle", "text-amber-700"];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
        <h2 className="font-serif text-base font-semibold text-ink">
          Top Contributors
        </h2>
      </div>

      <ol className="space-y-3">
        {top.map((c, i) => (
          <li key={c.userId} className="flex items-center gap-3">
            <span
              className={`w-5 text-center text-sm font-bold ${
                medal[i] ?? "text-faint"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-ink hover:text-accent-ink"
                >
                  {c.name}
                </a>
              ) : (
                <span className="block truncate text-sm font-medium text-ink">
                  {c.name}
                </span>
              )}
              <div className="text-xs text-subtle">
                {c.count} {c.count === 1 ? "submission" : "submissions"}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-muted">
              <Heart className="h-3.5 w-3.5 fill-danger text-danger" />
              {c.totalLikes}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
