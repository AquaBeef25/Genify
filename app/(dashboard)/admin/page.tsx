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
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-500">
        Checking access...
      </div>
    );
  }

  if (gate === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
        <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 h-8 w-8 text-zinc-500" />
          <h1 className="mb-2 text-lg font-bold">Not authorized</h1>
          <p className="text-sm text-zinc-400">
            This moderation view is restricted to the site admin. If that&apos;s
            you, make sure{" "}
            <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">
              NEXT_PUBLIC_ADMIN_USER_ID
            </code>{" "}
            matches your Supabase user id.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10 text-white">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">Moderation</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Review pending submissions. Approved ones appear in the public gallery.
        </p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
          Loading queue...
        </div>
      ) : pending.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-sm text-zinc-500">
          Nothing pending. You&apos;re all caught up. 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {pending.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 md:flex-row"
            >
              {/* Thumbnail */}
              <a
                href={s.video_url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-zinc-950 md:w-56"
              >
                {s.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-zinc-700">
                    <Play className="h-8 w-8" />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-300">
                  <ExternalLink className="h-3 w-3" /> Open
                </span>
              </a>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 font-semibold uppercase tracking-wider text-blue-400">
                    {s.platform}
                  </span>
                  {s.model_version && (
                    <span className="text-zinc-500">{s.model_version}</span>
                  )}
                  <span className="text-zinc-600">
                    by {s.submitter_name || "Anonymous"} ·{" "}
                    {new Date(s.submitted_at).toLocaleString()}
                  </span>
                </div>
                <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-300">
                  {s.prompt_text}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 flex-row gap-2 md:flex-col">
                <button
                  onClick={() => moderate(s.id, "approved")}
                  disabled={busyId === s.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50 md:flex-none"
                >
                  <Check className="h-4 w-4" /> Approve
                </button>
                <button
                  onClick={() => moderate(s.id, "rejected")}
                  disabled={busyId === s.id}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-red-900/20 hover:text-red-400 disabled:opacity-50 md:flex-none"
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
