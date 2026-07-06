"use client";

// Error boundary for the /prompt section. `error` is required by the
// convention but unused here, so it is not bound.
export default function PromptError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h2 className="font-serif text-2xl font-bold text-ink">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted">
        We couldn&apos;t load this prompt right now.
      </p>
      <button
        onClick={reset}
        className="accent-gradient mt-6 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
      >
        Try again
      </button>
    </div>
  );
}
