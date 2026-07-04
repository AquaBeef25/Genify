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

  const medal = ["text-yellow-400", "text-zinc-300", "text-amber-600"];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h2 className="text-sm font-semibold text-white">Top Contributors</h2>
      </div>

      <ol className="space-y-3">
        {top.map((c, i) => (
          <li key={c.userId} className="flex items-center gap-3">
            <span
              className={`w-5 text-center text-sm font-bold ${
                medal[i] ?? "text-zinc-600"
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
                  className="truncate text-sm font-medium text-zinc-200 hover:text-blue-400"
                >
                  {c.name}
                </a>
              ) : (
                <span className="truncate text-sm font-medium text-zinc-200">
                  {c.name}
                </span>
              )}
              <div className="text-xs text-zinc-500">
                {c.count} {c.count === 1 ? "submission" : "submissions"}
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
              <Heart className="h-3.5 w-3.5 fill-red-400 text-red-400" />
              {c.totalLikes}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
