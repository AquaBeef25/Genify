'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import Brand from '../../components/layout/Brand';
import Card from '../../components/ui/Card';
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setNotice('Account created — check your email to confirm, then sign in.');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4 py-10 text-ink">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] max-w-full -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(124,108,246,0.14),transparent)]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand />
          <h1 className="mt-6 font-serif text-3xl font-bold tracking-tight text-ink">
            Welcome to Genify
          </h1>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Turn a one-line idea into a directed, production-ready AI-video
            prompt.
          </p>
        </div>

        <Card className="p-8">
          <form className="space-y-5">
            <Field>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marvin@example.com"
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                onClick={handleSignIn}
              >
                Sign in
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={loading}
                onClick={handleSignUp}
              >
                Create account
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-subtle">
          Free to start. No credit card required.
        </p>
      </div>
    </div>
  );
}
