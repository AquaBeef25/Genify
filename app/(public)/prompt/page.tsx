import type { Metadata } from "next";
import Link from "next/link";
import {
  fetchApprovedSubmissions,
  buildPromptPath,
  truncate,
} from "../../lib/library";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "AI Video Prompt Library | Genify",
  description:
    "Browse real AI video prompts used to create results with Veo, Sora, Kling, Runway and more. Copy any prompt or generate your own free.",
  alternates: { canonical: "/prompt" },
};

export default async function PromptLibraryPage() {
  const submissions = await fetchApprovedSubmissions(100);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
          AI Video Prompt Library
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real prompts behind community results — copy any of them, or generate
          your own free.
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 text-sm text-subtle">
          No published prompts yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {submissions.map((s) => (
            <li key={s.id}>
              <Link
                href={buildPromptPath(s)}
                className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-accent hover:shadow-[0_4px_16px_rgba(217,119,87,0.1)]"
              >
                {s.thumbnail_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.thumbnail_url}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                )}
                <span className="text-xs font-medium text-muted">
                  {s.platform}
                  {s.model_version ? ` · ${s.model_version}` : ""}
                </span>
                <span className="line-clamp-3 text-sm text-ink">
                  {truncate(s.prompt_text, 140)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
