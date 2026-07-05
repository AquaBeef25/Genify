import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../../lib/rate-limit";
import { buildPrompt } from "../../lib/prompts";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    // 3. AUTHENTICATION — a valid Supabase session is required. Logged-out
    //    visitors are already bounced to /login by proxy.ts, so this endpoint
    //    simply rejects any request that arrives without a session (e.g. a
    //    direct API call).
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

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to generate prompts." },
        { status: 401 }
      );
    }

    // 4. GENERATE VIA GEMINI
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const finalPrompt = buildPrompt({ idea, format, previousResult, storyboard });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(finalPrompt);
    const generatedText = result.response.text();

    // 5. PERSIST and return the saved row id.
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
