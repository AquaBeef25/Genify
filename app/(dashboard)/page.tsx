"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

// Shared markdown styling so both the default blueprint and the storyboard
// (which uses h2 headings and horizontal rules between scenes) render cleanly.
const markdownComponents = {
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-white mt-5 mb-2 first:mt-0">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-zinc-300 leading-relaxed mb-4">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold text-white">{children}</strong>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 mb-4 text-zinc-300 space-y-1">{children}</ul>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="text-zinc-300">{children}</li>
  ),
  hr: () => <hr className="my-6 border-zinc-800" />,
};

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState("tiktok");
  const [storyboard, setStoryboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  // Refine state — used once an initial result exists.
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);

  // Core call to the generate API. `instruction` is the idea for a fresh
  // generation, or the revision instruction when `previousResult` is passed.
  const runGenerate = async (
    instruction: string,
    previousResult?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: instruction,
          format,
          storyboard,
          ...(previousResult ? { previousResult } : {}),
        }),
      });

      const data = await response.json();

      if (data.result) {
        setOutput(data.result);
        return true;
      } else {
        setOutput("Error: " + data.error);
        return false;
      }
    } catch {
      setOutput("Failed to connect to the server.");
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!idea) return alert("Please enter an idea first.");

    setLoading(true);
    setOutput("");
    await runGenerate(idea);
    setLoading(false);
  };

  const handleRefine = async () => {
    if (!refineInput || !output) return;

    setRefining(true);
    const ok = await runGenerate(refineInput, output);
    setRefining(false);
    if (ok) setRefineInput("");
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10 text-white">

      {/* Top Section / Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Discover Prompts</h1>
        <p className="text-sm text-zinc-400">Explore and generate production-ready AI instructions.</p>
      </div>

      {/* Main Content Workspace Grid */}
      <div className="grid gap-6 max-w-4xl">

        {/* The Generator Input Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Your Core Idea</label>
              <textarea
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                rows={3}
                placeholder="e.g. A tutorial on baking sourdough bread..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Target Format</label>
              <select
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="tiktok">TikTok / Reels (Vertical Short)</option>
                <option value="youtube">YouTube (Horizontal Long)</option>
                <option value="commercial">Cinematic Commercial</option>
              </select>
            </div>

            {/* Storyboard toggle */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-blue-500"
                checked={storyboard}
                onChange={(e) => setStoryboard(e.target.checked)}
              />
              <span className="text-sm text-zinc-300">
                Storyboard mode
                <span className="text-zinc-500"> — break the idea into a shot-by-shot breakdown</span>
              </span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 text-black font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Architecting..." : "Generate Prompt"}
            </button>
          </div>
        </div>

        {/* The Result Output Card */}
        {output && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <span className="text-sm font-medium text-zinc-300">Generated Blueprint</span>
              <button
                onClick={handleCopy}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors border border-zinc-700"
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </div>

            <div className="text-sm overflow-x-auto">
              <ReactMarkdown components={markdownComponents}>
                {output}
              </ReactMarkdown>
            </div>

            {/* Refine / follow-up */}
            <div className="border-t border-zinc-800 pt-4">
              <label className="block text-sm font-medium text-zinc-400 mb-1">Refine this blueprint</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                  placeholder="e.g. make it darker, add rain"
                  value={refineInput}
                  onChange={(e) => setRefineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRefine();
                  }}
                  disabled={refining}
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !refineInput}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold py-3 px-5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {refining ? "Refining..." : "Refine"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
