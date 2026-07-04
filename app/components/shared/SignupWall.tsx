import Link from "next/link";
import { Sparkles } from "lucide-react";

// Inline signup wall shown to guests once they've used their free generation
// (or when they try a signup-only action). Matches the app's card language.
export default function SignupWall({
  title = "Sign up to keep going",
  subtitle = "You've used your free prompt on this browser.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
            <li>• Generate unlimited prompts</li>
            <li>• Refine and iterate on any blueprint</li>
            <li>• Save your full generation history</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
