import { cache } from "react";
import { createPublicServerClient } from "./supabase-server";
import type { Submission } from "./submissions";

// Canonical site origin for metadata, sitemap and robots. Trailing slashes
// trimmed so we can safely concatenate paths.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

// A submission id is a UUID; it forms the resolvable tail of the URL.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// Turn free text into a short, URL-safe slug (the cosmetic part of the path).
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "prompt";
}

// Canonical path for a submission's public page: /prompt/<slug>-<uuid>.
export function buildPromptPath(
  s: Pick<Submission, "id" | "prompt_text">
): string {
  return `/prompt/${slugify(s.prompt_text)}-${s.id}`;
}

// Absolute canonical URL for a submission.
export function buildPromptUrl(
  s: Pick<Submission, "id" | "prompt_text">
): string {
  return `${SITE_URL}${buildPromptPath(s)}`;
}

// Pull the trailing submission UUID out of a `<slug>-<uuid>` route param.
export function parseSubmissionId(slugId: string): string | null {
  const match = slugId.match(new RegExp(`${UUID}$`, "i"));
  return match ? match[0].toLowerCase() : null;
}

// Collapse whitespace and hard-cap length (for titles/descriptions).
export function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

// Recent approved submissions, newest first (index hub + sitemap).
export async function fetchApprovedSubmissions(
  limit = 100
): Promise<Submission[]> {
  const supabase = createPublicServerClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("status", "approved")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchApprovedSubmissions failed:", error.message);
    return [];
  }
  return (data ?? []) as Submission[];
}

// A single approved submission by id. Wrapped in React cache() so the detail
// page and its generateMetadata share ONE query per request.
export const fetchSubmissionById = cache(
  async (id: string): Promise<Submission | null> => {
    const supabase = createPublicServerClient();
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle();
    if (error) {
      console.error("fetchSubmissionById failed:", error.message);
      return null;
    }
    return (data as Submission) ?? null;
  }
);
