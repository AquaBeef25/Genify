// Builds the full text prompt sent to Gemini.
// Extracted from route.ts so the default, storyboard, and refine variants
// live in one place instead of bloating the request handler.

export type BuildPromptArgs = {
  idea: string;
  format: string;
  // When present, the user is refining an earlier result rather than
  // generating from scratch — `idea` is treated as the revision instruction.
  previousResult?: string;
  // Switches the output structure to a shot-by-shot storyboard.
  storyboard?: boolean;
};

const DEFAULT_SYSTEM_PROMPT = `You are an expert AI video scriptwriter and director.
Take the user's core idea and format, and generate a structured production prompt.

Output the response in this exact format, using clear Markdown:
### 1. The Hook (0-3 seconds)
[Write a high-retention hook based on the idea]

### 2. Visual Style & Directives
- **Framing:** [e.g., Close-up, cinematic, top-down]
- **Pacing:** [e.g., Fast cuts, lo-fi aesthetic]

### 3. Optimized AI Video Generation Prompt
[A dense, highly descriptive paragraph designed for AI video tools]`;

const STORYBOARD_SYSTEM_PROMPT = `You are an expert AI video scriptwriter and director.
Take the user's core idea and format, and break it down into a shot-by-shot storyboard.

Output the response in this exact format, using clear Markdown. Produce 4-6 scenes.
For every scene use this structure:

### Scene 1
- **Camera:** [shot type & movement, e.g., slow dolly-in, handheld close-up]
- **Action:** [what happens on screen]
- **On-screen text:** [caption or subtitle, or "none"]
- **Duration:** [approximate seconds]

---

Repeat the block above for each scene, separated by a horizontal rule (---).
End with:

### Optimized AI Video Generation Prompt
[A dense, highly descriptive paragraph combining the scenes for AI video tools]`;

export function buildPrompt({
  idea,
  format,
  previousResult,
  storyboard,
}: BuildPromptArgs): string {
  const systemPrompt = storyboard
    ? STORYBOARD_SYSTEM_PROMPT
    : DEFAULT_SYSTEM_PROMPT;

  // Refine mode: revise the previous blueprint according to the new instruction,
  // keeping the same output structure.
  if (previousResult) {
    return `${systemPrompt}

Here is the previous blueprint:
${previousResult}

Revise it according to this instruction: ${idea}
Video Format: ${format}
Keep the same output structure described above.`;
  }

  return `${systemPrompt}

User Core Idea: ${idea}
Video Format: ${format}`;
}
