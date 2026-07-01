import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea, format } = body;

    if (!idea) {
      return NextResponse.json({ error: "Missing idea" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GEMENI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing Gemini API key. Add GEMINI_API_KEY to your .env.local file." },
        { status: 500 }
      );
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

    // Combine the instructions and user input so Gemini knows exactly what to do
    const finalPrompt = `${systemPrompt}\n\nUser Core Idea: ${idea}\nVideo Format: ${format}`;

    // Call the free Gemini 1.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(finalPrompt);
    
    // Extract the text from the response
    const generatedText = result.response.text();

    return NextResponse.json({ result: generatedText });
    
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Failed to generate prompt" }, { status: 500 });
  }
}