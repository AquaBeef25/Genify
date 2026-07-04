import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../../lib/rate-limit";
import { buildPrompt } from "../../lib/prompts";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Marks that an unauthenticated visitor has spent their single free
// generation. HttpOnly so page JS can't trivially clear it; ~30 days.
const GUEST_COOKIE = "guest_gen_used";
const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

export async function POST(request: Request) {
  try {
    // 1. SECURITY LAYER: per-IP rate limiter (burst / automated-abuse backstop)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";
    const rateLimit = checkRateLimit(ip, 3, 60000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      );
    }

    // 2. PAYLOAD
    const body = await request.json();
    const { idea, format, previousResult, storyboard } = body;

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    // 3. AUTHENTICATION — guests are allowed ONE free generation.
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

    const { data, error: authError } = await supabase.auth.getUser();
    const user = authError ? null : data?.user ?? null;

    // 4. GUEST GATING (only when there is no session)
    if (!user) {
      // Refining is a signup-only action.
      if (previousResult) {
        return NextResponse.json(
          { error: "Sign up to refine your prompt.", signupRequired: true },
          { status: 401 }
        );
      }
      // Already spent the one free generation? Reject BEFORE calling Gemini.
      if (cookieStore.get(GUEST_COOKIE)) {
        return NextResponse.json(
          {
            error: "You've used your free prompt. Sign up to keep generating.",
            signupRequired: true,
          },
          { status: 401 }
        );
      }
    }

    // 5. GENERATE VIA GEMINI (shared by guests and authed users)
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const finalPrompt = buildPrompt({ idea, format, previousResult, storyboard });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(finalPrompt);
    const generatedText = result.response.text();

    // 6. GUEST: mark the free gen spent, skip persistence, return.
    if (!user) {
      cookieStore.set(GUEST_COOKIE, "1", {
        httpOnly: true,
        path: "/",
        maxAge: GUEST_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return NextResponse.json({ result: generatedText, id: null, guest: true });
    }

    // 7. AUTHED: persist and return the saved row id.
    const { data: savedPrompt, error: dbError } = await supabase
      .from("prompts")
      .insert({
        user_id: user.id, // links the prompt to the logged-in user
        core_idea: idea,
        format: format,
        generated_result: generatedText,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Database save failed:", dbError);
      // Logged, but we still return the prompt so the UI doesn't break.
    }

    return NextResponse.json({ result: generatedText, id: savedPrompt?.id ?? null });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}
