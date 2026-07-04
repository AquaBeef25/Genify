"use client";

import { useState } from "react";
import Link from "next/link";
import { Share2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function DashboardPage() {
  const [copied, setCopied] = useState(false);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState("tiktok");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  // Id of the most recent saved prompt row, used to deep-link the "Share it" CTA.
  const [lastPromptId, setLastPromptId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!idea) return alert("Please enter an idea first.");
    
    setLoading(true);
    setOutput("");
    
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, format }),
      });
      
      const data = await response.json();
      
      if (data.result) {
        setOutput(data.result);
        setLastPromptId(data.id ?? null);
      } else {
        setOutput("Error: " + data.error);
      }
    } catch (error) {
      setOutput("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
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
              <ReactMarkdown 
                components={{
                  h3: ({ children }) => <h3 className="text-lg font-bold text-white mt-5 mb-2 first:mt-0">{children}</h3>,
                  p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-4">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-4 text-zinc-300 space-y-1">{children}</ul>,
                  li: ({ children }) => <li className="text-zinc-300">{children}</li>
                }}
              >
                {output}
              </ReactMarkdown>
            </div>

            {/* Share-to-gallery CTA — appears once a result exists. */}
            <Link
              href={lastPromptId ? `/submit?promptId=${lastPromptId}` : "/submit"}
              className="flex items-center justify-between gap-3 rounded-lg border border-blue-900/50 bg-blue-950/20 px-4 py-3 transition-colors hover:border-blue-800 hover:bg-blue-950/40"
            >
              <span className="flex items-center gap-2 text-sm text-blue-200">
                <Share2 className="h-4 w-4" />
                Got a result from this prompt? Share it in the gallery
              </span>
              <span className="text-sm font-semibold text-blue-300">→</span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}


