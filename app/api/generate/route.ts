import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { checkRateLimit } from "../../lib/rate-limit";

export async function POST(request: Request) {
  // One single try block to rule them all
  try {
    // 1. SECURITY LAYER: Get the user's IP address
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown-ip";

    // 2. ENFORCE LIMIT: Allow 3 requests per 1 minute
    const rateLimit = checkRateLimit(ip, 3, 60000);

    if (!rateLimit.success) {
      console.warn(`Blocked spammer from IP: ${ip}`);
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    // 3. EXTRACT CLIENT PAYLOAD
    const body = await request.json();
    const { idea, format } = body;

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    // 4. API CREDENTIAL CHECK
    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Gemini API key. Add GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // 5. GENERATE CONTENT VIA GEMINI
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

    return NextResponse.json({ result: generatedText });
    
  } catch (error) {
    // Any error inside the block drops straight down here
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}