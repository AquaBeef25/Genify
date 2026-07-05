'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // This logs the error to your browser console too
    console.error('Caught by Error Boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <Card className="max-w-xl p-8">
        <div className="mx-auto mb-5 grid h-11 w-11 place-items-center rounded-xl border border-danger/40 bg-danger/10 text-danger">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-ink">
          Something went wrong loading your prompts
        </h2>
        <p className="mb-6 text-sm text-muted">
          We hit an error while rendering this page. The details:
        </p>

        <div className="mb-6 overflow-auto rounded-lg border border-line bg-canvas p-4 text-left font-mono text-sm text-danger">
          {error.message}
        </div>

        <Button variant="primary" onClick={() => reset()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
