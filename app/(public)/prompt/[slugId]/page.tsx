import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { parseVideoUrl } from "../../../lib/embed";
import {
  fetchSubmissionById,
  parseSubmissionId,
  buildPromptUrl,
  truncate,
} from "../../../lib/library";
import CopyPromptButton from "../../../components/library/CopyPromptButton";

export const revalidate = 3600;

type Props = { params: Promise<{ slugId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugId } = await params;
  const id = parseSubmissionId(slugId);
  const submission = id ? await fetchSubmissionById(id) : null;

  if (!submission) {
    return { title: "Prompt not found | Genify" };
  }

  const title = `${truncate(submission.prompt_text, 60)} · AI video prompt | Genify`;
  const description = truncate(submission.prompt_text, 155);
  const canonical = buildPromptUrl(submission);
  const images = submission.thumbnail_url ? [submission.thumbnail_url] : [];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "article", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function PromptPage({ params }: Props) {
  const { slugId } = await params;
  const id = parseSubmissionId(slugId);
  const submission = id ? await fetchSubmissionById(id) : null;

  if (!submission) notFound();

  const video = parseVideoUrl(submission.video_url);

  // VideoObject structured data for rich results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: truncate(submission.prompt_text, 100),
    description: truncate(submission.prompt_text, 300),
    thumbnailUrl: submission.thumbnail_url ?? video?.thumbnailUrl ?? undefined,
    embedUrl: video?.embedUrl ?? undefined,
    contentUrl: submission.video_url,
    uploadDate: submission.submitted_at,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-6 text-sm text-muted">
        <Link href="/prompt" className="hover:text-ink">
          ← Prompt Library
        </Link>
      </nav>

      {video && (
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl border border-line bg-black">
          <iframe
            src={video.embedUrl}
            title="Video result"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-line px-2.5 py-1 font-medium text-muted">
          {submission.platform}
        </span>
        {submission.model_version && (
          <span className="rounded-full border border-line px-2.5 py-1 text-subtle">
            {submission.model_version}
          </span>
        )}
        {submission.submitter_name && (
          <span className="text-subtle">
            by{" "}
            {submission.submitter_url ? (
              <a
                href={submission.submitter_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent-ink underline hover:brightness-105"
              >
                {submission.submitter_name}
              </a>
            ) : (
              <span className="text-muted">{submission.submitter_name}</span>
            )}
          </span>
        )}
      </div>

      <h1 className="mb-4 font-serif text-3xl font-bold tracking-tight text-ink">
        AI Video Prompt
      </h1>

      <div className="mb-6 whitespace-pre-wrap rounded-xl border border-line bg-surface-2 p-5 font-mono text-sm leading-relaxed text-ink">
        {submission.prompt_text}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyPromptButton text={submission.prompt_text} />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-105"
        >
          <Sparkles className="h-4 w-4" />
          Generate your own free
        </Link>
      </div>
    </div>
  );
}
