"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Upload, LayoutDashboard } from "lucide-react";
import { createClient } from "../lib/supabase";

// Minimal public shell for the community gallery (no dashboard sidebar), so
// logged-out visitors get a clean showcase. Actions adapt to auth state.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data?.user));
  }, []);

  return (
    <div className="min-h-screen text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/gallery" className="flex items-center gap-2.5">
              <div className="accent-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight">
                Genify <span className="text-subtle">Gallery</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                href="/gallery"
                className="text-muted transition-colors hover:text-ink"
              >
                Gallery
              </Link>
              <Link
                href="/prompt"
                className="text-muted transition-colors hover:text-ink"
              >
                Prompt Library
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to app</span>
                </Link>
                <Link
                  href="/submit"
                  className="accent-gradient flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  <Upload className="h-4 w-4" />
                  Share a result
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="accent-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
