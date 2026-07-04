// Shared types & constants for the community submission gallery.

// The AI tool the video was generated with (distinct from where it is hosted).
export const PLATFORMS = [
  "Veo",
  "Sora",
  "Kling",
  "Runway",
  "Google AI Studio",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export type SubmissionStatus = "pending" | "approved" | "rejected";

// Mirrors the public.submissions table (see supabase/schema.sql).
export type Submission = {
  id: string;
  user_id: string;
  prompt_id: string | null;
  prompt_text: string;
  platform: Platform;
  model_version: string | null;
  video_url: string;
  thumbnail_url: string | null;
  submitter_name: string | null;
  submitter_url: string | null;
  status: SubmissionStatus;
  likes_count: number;
  submitted_at: string;
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}
