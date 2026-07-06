"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Client copy-to-clipboard control for the (server-rendered) prompt page.
export default function CopyPromptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (insecure context); fail silently.
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="accent-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied!" : "Copy prompt"}
    </button>
  );
}
