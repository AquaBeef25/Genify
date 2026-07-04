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
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link href="/gallery" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Genify <span className="text-zinc-500">Gallery</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to app</span>
                </Link>
                <Link
                  href="/submit"
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  <Upload className="h-4 w-4" />
                  Share a result
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-zinc-200"
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
