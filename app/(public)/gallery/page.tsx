"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Flame } from "lucide-react";
import { createClient } from "../../lib/supabase";
import { PLATFORMS, type Submission } from "../../lib/submissions";
import SubmissionCard from "../../components/gallery/SubmissionCard";
import SubmissionModal from "../../components/gallery/SubmissionModal";
import Leaderboard from "../../components/gallery/Leaderboard";

type SortBy = "recent" | "likes";

const PLATFORM_FILTERS = ["all", ...PLATFORMS] as const;

export default function GalleryPage() {
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmittedBanner, setShowSubmittedBanner] = useState(false);

  useEffect(() => {
    const load = async () => {
      setShowSubmittedBanner(
        new URLSearchParams(window.location.search).get("submitted") === "1"
      );

      const supabase = createClient();

      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id ?? null;
      setUserId(uid);

      const { data, error: fetchError } = await supabase
        .from("submissions")
        .select("*")
        .eq("status", "approved")
        .order("submitted_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = (data ?? []) as Submission[];
      setSubmissions(rows);

      // Which of these has the current user already liked?
      if (uid && rows.length > 0) {
        const { data: likes } = await supabase
          .from("submission_likes")
          .select("submission_id")
          .eq("user_id", uid);
        if (likes) setLikedIds(new Set(likes.map((l) => l.submission_id)));
      }

      setLoading(false);
    };

    load();
  }, []);

  const toggleLike = async (submission: Submission) => {
    if (!userId) {
      router.push("/login");
      return;
    }

    const supabase = createClient();
    const isLiked = likedIds.has(submission.id);
    const delta = isLiked ? -1 : 1;

    // Optimistic update of both the liked set and the denormalized count.
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(submission.id);
      else next.add(submission.id);
      return next;
    });
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === submission.id
          ? { ...s, likes_count: Math.max(0, s.likes_count + delta) }
          : s
      )
    );

    const { error: likeError } = isLiked
      ? await supabase
          .from("submission_likes")
          .delete()
          .eq("submission_id", submission.id)
          .eq("user_id", userId)
      : await supabase
          .from("submission_likes")
          .insert({ submission_id: submission.id, user_id: userId });

    if (likeError) {
      // Revert on failure.
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.add(submission.id);
        else next.delete(submission.id);
        return next;
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? { ...s, likes_count: Math.max(0, s.likes_count - delta) }
            : s
        )
      );
    }
  };

  const visible = useMemo(() => {
    const filtered =
      platformFilter === "all"
        ? submissions
        : submissions.filter((s) => s.platform === platformFilter);

    const sorted = [...filtered];
    if (sortBy === "likes") {
      sorted.sort(
        (a, b) =>
          b.likes_count - a.likes_count ||
          +new Date(b.submitted_at) - +new Date(a.submitted_at)
      );
    }
    // "recent" order already comes from the query (submitted_at desc).
    return sorted;
  }, [submissions, platformFilter, sortBy]);

  const selected = selectedId
    ? submissions.find((s) => s.id === selectedId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
          Community Gallery
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real results from Genify prompts — grab a prompt and make your own.
        </p>
      </div>

      {showSubmittedBanner && (
        <div className="mb-6 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-ink">
          Thanks for sharing! Your submission is pending review and will appear
          here once approved.
        </div>
      )}

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        {/* Main column */}
        <div className="lg:col-span-3">
          {/* Filters + sort */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {PLATFORM_FILTERS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    platformFilter === p
                      ? "accent-gradient text-white"
                      : "border border-line text-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {p === "all" ? "All" : p}
                </button>
              ))}
            </div>

            <div className="flex shrink-0 gap-1 rounded-lg border border-line p-1">
              <button
                onClick={() => setSortBy("recent")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortBy === "recent"
                    ? "bg-accent/10 text-accent-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> Recent
              </button>
              <button
                onClick={() => setSortBy("likes")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortBy === "likes"
                    ? "bg-accent/10 text-accent-ink"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Flame className="h-3.5 w-3.5" /> Most liked
              </button>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-subtle">
              Loading the gallery...
            </div>
          ) : error ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-danger/40 bg-danger/5 text-sm text-danger">
              {error}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface-2 text-center text-sm text-subtle">
              <span>No approved submissions yet.</span>
              <span className="text-faint">Be the first to share a result!</span>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 text-sm text-subtle">
              No submissions for this platform yet.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  liked={likedIds.has(s.id)}
                  onOpen={() => setSelectedId(s.id)}
                  onToggleLike={() => toggleLike(s)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard sidebar */}
        <aside className="mt-8 lg:col-span-1 lg:mt-0">
          <div className="lg:sticky lg:top-20">
            <Leaderboard submissions={submissions} />
          </div>
        </aside>
      </div>

      {selected && (
        <SubmissionModal
          submission={selected}
          liked={likedIds.has(selected.id)}
          onClose={() => setSelectedId(null)}
          onToggleLike={() => toggleLike(selected)}
        />
      )}
    </div>
  );
}
