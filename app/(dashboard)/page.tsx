"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { createClient } from "../lib/supabase";
import SignupWall from "../components/shared/SignupWall";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import Switch from "../components/ui/Switch";
import { Field, Label, Input, Textarea } from "../components/ui/Field";
import { cn } from "../components/ui/cn";

// Mirror of the server's HttpOnly guest cookie, for instant UX (the cookie
// stays authoritative server-side).
const GUEST_USED_KEY = "guest_gen_used";

const FORMATS = [
  { value: "tiktok", title: "TikTok / Reels", sub: "Vertical short" },
  { value: "youtube", title: "YouTube", sub: "Horizontal long" },
  { value: "commercial", title: "Cinematic", sub: "Commercial" },
];

const FORMAT_LABEL: Record<string, string> = {
  tiktok: "TikTok / Reels",
  youtube: "YouTube",
  commercial: "Cinematic",
};

// Shared markdown styling so both the default blueprint and the storyboard
// (which uses h2 headings and horizontal rules between scenes) render cleanly.
const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mt-6 mb-3 text-xl font-bold text-ink first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mt-6 mb-2.5 flex items-center gap-2.5 text-[15px] font-bold text-ink first:mt-0">
      <span className="accent-gradient h-4 w-1 shrink-0 rounded-full" />
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mt-5 mb-2 text-sm font-semibold text-accent-ink first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3.5 text-[14.5px] leading-relaxed text-muted">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3.5 space-y-1.5">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="relative pl-5 text-[14px] leading-relaxed text-muted">
      <span className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </li>
  ),
  hr: () => <hr className="my-6 border-line" />,
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-3.5 overflow-x-auto rounded-lg border border-line border-l-[3px] border-l-accent bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-ink">
      {children}
    </pre>
  ),
  code: ({ children }: { children?: React.ReactNode }) => (
    <code className="font-mono text-[13px] text-accent-ink">{children}</code>
  ),
};

function ResultSkeleton() {
  return (
    <Card className="animate-rise p-6">
      <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-2 h-24 w-full" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState("tiktok");
  const [storyboard, setStoryboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  // Id of the most recent saved prompt row, used to deep-link the "Share it" CTA.
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);

  // Refine state — used once an initial result exists.
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);

  // Guest state — drives the signup wall for logged-out visitors.
  const [isGuest, setIsGuest] = useState(false);
  const [guestUsed, setGuestUsed] = useState(false);
  const [showWall, setShowWall] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const guest = !data?.user;
      setIsGuest(guest);
      if (guest && localStorage.getItem(GUEST_USED_KEY)) {
        setGuestUsed(true);
      }
    });
  }, []);

  // Core call to the generate API. `instruction` is the idea for a fresh
  // generation, or the revision instruction when `previousResult` is passed.
  const runGenerate = async (
    instruction: string,
    previousResult?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: instruction,
          format,
          storyboard,
          ...(previousResult ? { previousResult } : {}),
        }),
      });

      const data = await response.json();

      // Guest hit the wall (limit reached, or a signup-only action). Sync the
      // local flag in case the server cookie is ahead of localStorage.
      if (data.signupRequired) {
        setIsGuest(true);
        setGuestUsed(true);
        localStorage.setItem(GUEST_USED_KEY, "1");
        setShowWall(true);
        return false;
      }

      if (data.result) {
        setOutput(data.result);
        setLastPromptId(data.id ?? null);
        if (data.guest) {
          setGuestUsed(true);
          localStorage.setItem(GUEST_USED_KEY, "1");
        }
        return true;
      } else {
        setOutput("Error: " + data.error);
        return false;
      }
    } catch {
      setOutput("Failed to connect to the server.");
      return false;
    }
  };

  const handleGenerate = async () => {
    // Known-spent guest: show the wall without a wasted round trip.
    if (isGuest && guestUsed) {
      setShowWall(true);
      return;
    }
    if (!idea) return alert("Please enter an idea first.");

    setLoading(true);
    setOutput("");
    setShowWall(false);
    await runGenerate(idea);
    setLoading(false);
  };

  const handleRefine = async () => {
    if (!refineInput || !output) return;

    setRefining(true);
    const ok = await runGenerate(refineInput, output);
    setRefining(false);
    if (ok) setRefineInput("");
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="relative overflow-x-clip">
      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        {/* Hero */}
        <header className="hero-glow relative mb-8">
          <span className="relative z-[1] mb-3.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Generator
          </span>
          <h1 className="relative z-[1] max-w-[20ch] font-serif text-4xl font-bold tracking-tight text-balance text-ink">
            Turn an idea into a shot-ready prompt.
          </h1>
          <p className="relative z-[1] mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
            Describe a core idea, pick a format, and Genify directs it into a
            production-ready blueprint — hook, visual style, and an optimized
            AI-video prompt.
          </p>
        </header>

        {/* Generator input card */}
        <Card className="mb-6 p-6">
          <div className="grid gap-6">
            <Field>
              <Label htmlFor="idea">Your core idea</Label>
              <Textarea
                id="idea"
                rows={3}
                placeholder="e.g. A tutorial on baking sourdough bread..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </Field>

            <Field>
              <Label>Target format</Label>
              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                role="group"
                aria-label="Target format"
              >
                {FORMATS.map((f) => {
                  const active = format === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(f.value)}
                      aria-pressed={active}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-lg border px-3.5 py-3 text-left transition-colors",
                        active
                          ? "border-accent/30 bg-accent/10 text-white"
                          : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
                      )}
                    >
                      <span className="text-[13.5px] font-semibold">{f.title}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          active ? "text-accent-ink" : "text-subtle"
                        )}
                      >
                        {f.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="flex items-center gap-3 py-0.5">
              <Switch
                id="storyboard"
                checked={storyboard}
                onChange={setStoryboard}
                aria-label="Storyboard mode"
              />
              <div className="text-[13.5px] leading-tight">
                <span className="font-medium text-ink">Storyboard mode</span>
                <span className="block text-xs text-subtle">
                  Break the idea into a shot-by-shot breakdown
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={loading}
              onClick={handleGenerate}
            >
              {!loading && <Sparkles className="h-[17px] w-[17px]" />}
              {loading ? "Architecting…" : "Generate prompt"}
            </Button>
          </div>
        </Card>

        {/* Loading skeleton (initial generation only) */}
        {loading && <ResultSkeleton />}

        {/* Result */}
        {output && (
          <Card className="animate-rise overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <Badge>{FORMAT_LABEL[format] ?? format}</Badge>
                <span className="text-[13.5px] font-semibold text-muted">
                  Generated blueprint
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>

            <div className="px-6 py-5">
              <ReactMarkdown components={markdownComponents}>{output}</ReactMarkdown>
            </div>

            {/* Share + Refine are signup-only, so hide them for guests. */}
            {!isGuest && (
              <div className="grid gap-4 px-6 pb-6">
                {/* Share-to-gallery CTA — appears once a result exists. */}
                <Link
                  href={lastPromptId ? `/submit?promptId=${lastPromptId}` : "/submit"}
                  className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-accent-ink transition hover:brightness-125"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Share2 className="h-4 w-4" />
                    Got a result from this prompt? Share it in the gallery
                  </span>
                  <span className="text-sm font-bold">→</span>
                </Link>

                {/* Refine / follow-up */}
                <div className="grid gap-2.5 border-t border-line pt-4">
                  <Label htmlFor="refine">Refine this blueprint</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="refine"
                      className="flex-1"
                      placeholder="e.g. make it darker, add rain"
                      value={refineInput}
                      onChange={(e) => setRefineInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRefine();
                      }}
                      disabled={refining}
                    />
                    <Button
                      variant="accent"
                      onClick={handleRefine}
                      loading={refining}
                      disabled={!refineInput}
                      className="whitespace-nowrap sm:w-auto"
                    >
                      Refine
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Signup wall — shown to guests after their free result, or when they
            try a signup-only action. */}
        {isGuest && (output || showWall) && (
          <div className="mt-6">
            <SignupWall
              subtitle={
                output
                  ? "That's your free prompt — sign up to generate more, refine, and save it."
                  : "You've used your free prompt on this browser."
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
