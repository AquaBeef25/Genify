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

      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/prompt" className="hover:text-white">
          ← Prompt Library
        </Link>
      </nav>

      {video && (
        <div className="mb-6 aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
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
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 font-medium text-zinc-300">
          {submission.platform}
        </span>
        {submission.model_version && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-zinc-400">
            {submission.model_version}
          </span>
        )}
        {submission.submitter_name && (
          <span className="text-zinc-500">
            by{" "}
            {submission.submitter_url ? (
              <a
                href={submission.submitter_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-zinc-400 underline hover:text-white"
              >
                {submission.submitter_name}
              </a>
            ) : (
              <span className="text-zinc-400">{submission.submitter_name}</span>
            )}
          </span>
        )}
      </div>

      <h1 className="mb-4 text-2xl font-bold tracking-tight text-white">
        AI Video Prompt
      </h1>

      <div className="mb-6 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 font-mono text-sm leading-relaxed text-zinc-200">
        {submission.prompt_text}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <CopyPromptButton text={submission.prompt_text} />
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-blue-800 bg-blue-950/30 px-4 py-2 text-sm font-semibold text-blue-200 transition-colors hover:bg-blue-950/60"
        >
          <Sparkles className="h-4 w-4" />
          Generate your own free
        </Link>
      </div>
    </div>
  );
}
