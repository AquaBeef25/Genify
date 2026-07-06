"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "../../lib/supabase";
import { parseVideoUrl } from "../../lib/embed";
import { PLATFORMS, type Platform } from "../../lib/submissions";

export default function SubmitPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>("Veo");
  const [modelVersion, setModelVersion] = useState("");
  const [promptText, setPromptText] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitterUrl, setSubmitterUrl] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getUser();
      const user = data?.user;
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Default the credit to the email local-part; user can override.
      if (user.email) setSubmitterName(user.email.split("@")[0]);

      // Prefill the prompt from generation history when arriving via
      // /submit?promptId=<id>. Read the query directly off the URL to avoid the
      // useSearchParams Suspense requirement in this Next.js build.
      const id = new URLSearchParams(window.location.search).get("promptId");
      if (id) {
        setPromptId(id);
        const { data: prompt } = await supabase
          .from("prompts")
          .select("generated_result, format")
          .eq("id", id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (prompt?.generated_result) setPromptText(prompt.generated_result);
      }

      setCheckingAuth(false);
    };
    init();
  }, [router]);

  const parsedVideo = useMemo(() => parseVideoUrl(videoUrl), [videoUrl]);
  const urlTouched = videoUrl.trim().length > 0;
  const canSubmit =
    !!parsedVideo && promptText.trim().length > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_url: videoUrl,
          platform,
          model_version: modelVersion,
          prompt_text: promptText,
          prompt_id: promptId,
          submitter_name: submitterName,
          submitter_url: submitterUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }

      // Pending until you approve it — send them to the gallery.
      router.push("/gallery?submitted=1");
    } catch {
      setError("Failed to connect to the server.");
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-subtle">
        Loading...
      </div>
    );
  }

  const inputClass =
    "w-full bg-surface-2 border border-line rounded-lg p-3 text-ink placeholder:text-faint focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition";

  return (
    <div className="min-h-screen p-6 text-ink md:p-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight">Share a Result</h1>
        <p className="text-sm text-muted">
          Got a great video from a Genify prompt? Share the link and it&apos;ll
          appear in the community gallery once approved.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 max-w-2xl">
        <div className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Video link */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Video link
            </label>
            <input
              className={inputClass}
              placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              inputMode="url"
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              {!urlTouched ? (
                <span className="text-subtle">
                  Paste an unlisted YouTube or Vimeo link — we never host files.
                </span>
              ) : parsedVideo ? (
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Looks good — {parsedVideo.provider} link detected.
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-danger">
                  <XCircle className="h-3.5 w-3.5" />
                  Only YouTube and Vimeo links are supported.
                </span>
              )}
            </div>
          </div>

          {/* Platform + model */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">
                Platform used
              </label>
              <select
                className={inputClass}
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">
                Model version{" "}
                <span className="text-faint">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Veo 3, Kling 1.6"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
              />
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Prompt used
            </label>
            <textarea
              className={inputClass}
              rows={6}
              placeholder="The exact prompt you gave the AI tool..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
            {promptId && (
              <p className="mt-1 text-xs text-subtle">
                Prefilled from your generation history — edit it to match what
                you actually used.
              </p>
            )}
          </div>
        </div>

        {/* Credit */}
        <div className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="text-xs font-medium uppercase tracking-wider text-subtle">
            How to credit you
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">
                Display name
              </label>
              <input
                className={inputClass}
                placeholder="Your name or handle"
                value={submitterName}
                onChange={(e) => setSubmitterName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">
                Link <span className="text-faint">(optional)</span>
              </label>
              <input
                className={inputClass}
                placeholder="https://your-site-or-social"
                value={submitterUrl}
                onChange={(e) => setSubmitterUrl(e.target.value)}
                inputMode="url"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="accent-gradient rounded-lg px-6 py-3 font-semibold text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit for review"}
          </button>
          <span className="text-xs text-subtle">
            Submissions are reviewed before appearing publicly.
          </span>
        </div>
      </form>
    </div>
  );
}
