'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import { Field, Label, Input } from '../../components/ui/Field';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Initialize our secure database client
  const supabase = createClient();

  // The OAuth callback redirects here as /login?authError=1 when the code
  // exchange (or the flow start) failed. Surface it in the existing notice.
  // This is a one-shot, client-only read on mount — the query param isn't known
  // during SSR, so an effect is the hydration-safe place to set it. The
  // set-state-in-effect rule's cascading-render concern doesn't apply to a
  // single mount-time read; scoped disable (the repo uses scoped disables for
  // legitimate react-hooks cases, e.g. sidebar.tsx).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('authError')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Google sign-in failed — please try again, or use email & password.');
    }
  }, []);

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      setNotice('Account created — check your email to confirm, then sign in.');
    }
    setLoading(false);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // If login is successful, send them to the protected dashboard
      router.push('/');
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // On success the browser is already navigating to Google; we only reach
    // here if the flow failed to *start*.
    if (error) setError(error.message);
  };

  // OAuth is wired in a later step and needs Supabase provider config; keep the
  // buttons honest until then.
  const handleSocialSoon = () => {
    setError(null);
    setNotice('Social sign-in is coming soon — email & password work today.');
  };

  return (
    <div className="flex min-h-screen text-ink">
      {/* Left — branding panel (desktop only) */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-line bg-gradient-to-b from-surface-2 to-canvas p-12 md:flex">
        {/* Soft decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[6%] top-[12%] h-32 w-32 rounded-[42%_58%_65%_35%/40%_45%_55%_60%] bg-accent/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[16%] right-[10%] h-28 w-28 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] bg-accent/[0.07]"
        />

        <div className="relative">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink">
            Genify
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-subtle">
            Prompt Studio
          </p>
        </div>

        <div className="relative max-w-sm">
          <p className="font-serif text-3xl font-semibold leading-tight text-ink">
            Turn ideas into videos with AI prompts
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Create beautiful, professional videos from simple text descriptions.
            Join creators worldwide building with Genify.
          </p>
        </div>

        <div className="relative flex gap-3">
          <span className="h-2 w-2 rounded-full bg-accent/80" />
          <span className="h-2 w-2 rounded-full bg-accent/50" />
          <span className="h-2 w-2 rounded-full bg-accent/30" />
        </div>
      </div>

      {/* Right — form panel */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted">Sign in to continue creating</p>
          </div>

          <form className="space-y-4" onSubmit={handleSignIn}>
            <Field>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-accent-ink transition hover:brightness-105"
              >
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            {notice && (
              <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
                {notice}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="whitespace-nowrap text-[11px] text-subtle">
              Or continue with
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Social */}
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={handleGoogleSignIn}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1H12v3.83h5.35c-.23 1.4-1.62 4.1-5.35 4.1a5.7 5.7 0 0 1 0-11.4c1.63 0 2.72.7 3.34 1.3l2.28-2.2A9.6 9.6 0 0 0 12 2.5a9.5 9.5 0 1 0 0 19c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.15-1.13Z"
                />
              </svg>
              Google
            </Button>
            <Button type="button" variant="secondary" onClick={handleSocialSoon}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.22.66-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.16.57.67.48A10 10 0 0 0 12 2Z"
                />
              </svg>
              GitHub
            </Button>
          </div>

          {/* Sign up */}
          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => handleSignUp()}
              disabled={loading}
              className="font-semibold text-accent-ink transition hover:brightness-105 disabled:opacity-50"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
