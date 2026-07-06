"use client";

import { useEffect, useState } from "react";
import { Check, X, ExternalLink, Play, ShieldAlert } from "lucide-react";
import { createClient } from "../../lib/supabase";
import type { Submission } from "../../lib/submissions";

type Gate = "checking" | "denied" | "ok";

export default function AdminPage() {
  const [gate, setGate] = useState<Gate>("checking");
  const [pending, setPending] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      // Cosmetic gate — the RLS UPDATE policy is the real enforcement.
      if (!user || !adminId || user.id !== adminId) {
        setGate("denied");
        return;
      }
      setGate("ok");

      const { data: rows } = await supabase
        .from("submissions")
        .select("*")
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });

      setPending((rows ?? []) as Submission[]);
      setLoading(false);
    };
    init();
  }, []);

  const moderate = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("submissions")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Could not update: " + error.message);
      setBusyId(null);
      return;
    }
    // Drop it from the pending queue.
    setPending((prev) => prev.filter((s) => s.id !== id));
    setBusyId(null);
  };

  if (gate === "checking") {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-subtle">
        Checking access...
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-ink">
        <div className="max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-subtle" />
          <h1 className="mb-2 font-serif text-xl font-bold">Not authorized</h1>
          <p className="text-sm text-muted">
            This moderation view is restricted to the site admin. If that&apos;s
            you, make sure{" "}
            <code className="rounded border border-line bg-surface-2 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_ADMIN_USER_ID
            </code>{" "}
            matches your Supabase user id.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-ink md:p-10">
      <div className="mb-8 border-b border-line pb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Moderation</h1>
        <p className="mt-1 text-sm text-muted">
          Review pending submissions. Approved ones appear in the public gallery.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-subtle">
          Loading queue...
        </div>
      ) : pending.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 text-sm text-subtle">
          Nothing pending. You&apos;re all caught up. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:flex-row"
            >
              {/* Thumbnail (media — stays dark) */}
              <a
                href={s.video_url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-elevated md:w-56"
              >
                {s.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-faint">
                    <Play className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white/80">
                  <ExternalLink className="h-3 w-3" /> Open
                </span>
              </a>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-accent-ink">
                    {s.platform}
                  </span>
                  {s.model_version && (
                    <span className="text-subtle">{s.model_version}</span>
                  )}
                  <span className="text-faint">
                    by {s.submitter_name || "Anonymous"} ·{" "}
                    {new Date(s.submitted_at).toLocaleString()}
                  </span>
                </div>
                <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 text-xs leading-relaxed text-ink">
                  {s.prompt_text}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                <button
                  onClick={() => moderate(s.id, "approved")}
                  disabled={busyId === s.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-50 md:flex-none"
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => moderate(s.id, "rejected")}
                  disabled={busyId === s.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50 md:flex-none"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
