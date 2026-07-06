import Link from "next/link";
import { Sparkles, Check } from "lucide-react";

const PERKS = [
  "Generate unlimited prompts",
  "Refine and iterate on any blueprint",
  "Save your full generation history",
];

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
    <div className="animate-rise rounded-2xl border border-accent/30 bg-accent/10 p-6">
      <div className="flex items-start gap-4">
        <div className="accent-gradient grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-accent" />
                {perk}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="accent-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
