'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import { Field, Label, Input } from '../../components/ui/Field';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-ink">
      <div className="w-full max-w-[380px]">
        <div className="mb-8">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-ink">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-muted">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-success">
            Check your inbox — if an account exists for{' '}
            <span className="font-semibold">{email}</span>, a password-reset link
            is on its way.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
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

            {error && (
              <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
            >
              Send reset link
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
