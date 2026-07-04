import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../../lib/rate-limit";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // 1. SECURITY LAYER: Rate Limiter
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";
    const rateLimit = checkRateLimit(ip, 3, 60000);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute." },
        { status: 429 }
      );
    }

    // 2. AUTHENTICATION: Check who is making the request
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

    // Verify the user's secure token
    const { data, error: authError } = await supabase.auth.getUser();
    const user = data?.user;

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. You must be logged in to generate prompts." },
        { status: 401 }
      );
    }

    // 3. EXTRACT CLIENT PAYLOAD
    const body = await request.json();
    const { idea, format } = body;

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    // 4. GENERATE CONTENT VIA GEMINI
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing Gemini API key." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = `You are an expert AI video scriptwriter and director. 
Take the user's core idea and format, and generate a structured production prompt.

Output the response in this exact format, using clear Markdown:
### 1. The Hook (0-3 seconds)
[Write a high-retention hook based on the idea]

### 2. Visual Style & Directives
- **Framing:** [e.g., Close-up, cinematic, top-down]
- **Pacing:** [e.g., Fast cuts, lo-fi aesthetic]

### 3. Optimized AI Video Generation Prompt
[A dense, highly descriptive paragraph designed for AI video tools]`;

    const finalPrompt = `${systemPrompt}\n\nUser Core Idea: ${idea}\nVideo Format: ${format}`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(finalPrompt);
    const generatedText = result.response.text();

    // 5. DATABASE SAVE: Store the memory in Supabase
    const { data: savedPrompt, error: dbError } = await supabase
      .from("prompts")
      .insert({
        user_id: user.id, // This links the prompt to the specific logged-in user
        core_idea: idea,
        format: format,
        generated_result: generatedText
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Database save failed:", dbError);
      // We log it, but we still return the prompt to the user so their UI doesn't break
    }

    // 6. RETURN SUCCESS
    // `id` lets the client deep-link the "Share this result" CTA to the submit
    // form (/submit?promptId=...). It may be null if the DB save failed above.
    return NextResponse.json({ result: generatedText, id: savedPrompt?.id ?? null });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}