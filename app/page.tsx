"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState("tiktok");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

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
    
    // Reset the button text back to "Copy" after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">Prompt Architect</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Your Core Idea</label>
            <textarea 
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="e.g. A tutorial on baking sourdough bread..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Target Format</label>
            <select 
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Architecting..." : "Generate Prompt"}
          </button>
        </div>

       {/* Display the Result */}
        {/* Display the Result */}
        {/* Display the Result */}
        {output && (
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-neutral-400">Generated Blueprint</span>
              <button 
                onClick={handleCopy}
                className="text-xs bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-1.5 px-3 rounded-md transition-colors border border-neutral-700"
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </div>
            
            <div className="p-6 bg-neutral-950 border border-neutral-800 rounded-xl shadow-inner text-sm overflow-x-auto">
              <ReactMarkdown 
                components={{
                  h3: ({ children }) => <h3 className="text-xl font-bold text-white mt-6 mb-3 first:mt-0">{children}</h3>,
                  p: ({ children }) => <p className="text-neutral-300 leading-relaxed mb-4">{children}</p>,
                  strong: ({ children }) => <strong className="font-bold text-blue-400">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-5 mb-4 text-neutral-300 space-y-2">{children}</ul>,
                  li: ({ children }) => <li className="text-neutral-300">{children}</li>
                }}
              >
                {output}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}