'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // This logs the error to your browser console too
    console.error("Caught by Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl rounded-xl border border-red-900 bg-red-950/30 p-8 shadow-2xl">
        <h2 className="mb-4 text-2xl font-bold text-red-500">System Crash Detected</h2>
        <p className="mb-6 text-sm text-red-200">
          The server component failed to render. Here is the exact reason:
        </p>
        
        {/* This box prints the actual crash reason */}
        <div className="mb-6 rounded bg-black/50 p-4 text-left font-mono text-sm text-red-400 overflow-auto">
          {error.message}
        </div>

        <button
          onClick={() => reset()}
          className="rounded-lg bg-white px-6 py-2 font-semibold text-black hover:bg-zinc-200 transition-colors"
        >
          Attempt Recovery (Refresh)
        </button>
      </div>
    </div>
  );
}