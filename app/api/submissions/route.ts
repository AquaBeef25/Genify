import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkRateLimit } from "../../lib/rate-limit";
import { parseVideoUrl } from "../../lib/embed";
import { isPlatform } from "../../lib/submissions";

// Fetch a Vimeo thumbnail via its public oEmbed endpoint. Best-effort: if it
// fails or times out we just fall back to no thumbnail (the gallery card shows
// a play-icon placeholder). YouTube thumbnails are derived from the id and
// never need this.
async function fetchVimeoThumbnail(videoUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // 1. RATE LIMIT (per IP, same limiter used by /api/generate)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";
    const rateLimit = checkRateLimit(ip, 5, 60000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many submissions. Please wait a minute." },
        { status: 429 }
      );
    }

    // 2. AUTH
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData?.user;
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in to share a result." },
        { status: 401 }
      );
    }

    // 3. PAYLOAD
    const body = await request.json();
    const {
      video_url,
      platform,
      model_version,
      prompt_text,
      prompt_id,
      submitter_name,
      submitter_url,
    } = body ?? {};

    if (!prompt_text || typeof prompt_text !== "string" || !prompt_text.trim()) {
      return NextResponse.json({ error: "Missing prompt text." }, { status: 400 });
    }
    if (!isPlatform(platform)) {
      return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
    }

    // 4. VALIDATE THE VIDEO LINK (server-side guard — cannot be bypassed)
    const parsed = typeof video_url === "string" ? parseVideoUrl(video_url) : null;
    if (!parsed) {
      return NextResponse.json(
        { error: "Video link must be a valid YouTube or Vimeo URL." },
        { status: 400 }
      );
    }

    // 5. DERIVE THUMBNAIL
    const thumbnail_url =
      parsed.thumbnailUrl ??
      (parsed.provider === "vimeo" ? await fetchVimeoThumbnail(video_url) : null);

    // 6. Only attribute to a prompt the user actually owns.
    let safePromptId: string | null = null;
    if (prompt_id && typeof prompt_id === "string") {
      const { data: owned } = await supabase
        .from("prompts")
        .select("id")
        .eq("id", prompt_id)
        .eq("user_id", user.id)
        .maybeSingle();
      safePromptId = owned?.id ?? null;
    }

    const trim = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;

    // 7. INSERT (RLS enforces user_id === auth.uid() and status === 'pending')
    const { data: inserted, error: dbError } = await supabase
      .from("submissions")
      .insert({
        user_id: user.id,
        prompt_id: safePromptId,
        prompt_text: prompt_text.trim(),
        platform,
        model_version: trim(model_version),
        video_url: video_url.trim(),
        thumbnail_url,
        submitter_name: trim(submitter_name),
        submitter_url: trim(submitter_url),
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Submission insert failed:", dbError);
      return NextResponse.json(
        { error: "Could not save your submission. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission: inserted });
  } catch (error) {
    console.error("Submissions API Error:", error);
    return NextResponse.json({ error: "Failed to submit." }, { status: 500 });
  }
}
