'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Sparkles } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import PromptCard, { type Prompt } from '../../components/shared/PromptCard';
import { Card } from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import { cn } from '../../components/ui/cn';

const FORMAT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'commercial', label: 'Commercial' },
];

function CardSkeleton() {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mb-2 h-3.5 w-24" />
      <Skeleton className="mb-1.5 h-4 w-full" />
      <Skeleton className="mb-4 h-4 w-2/3" />
      <Skeleton className="h-40 w-full" />
    </Card>
  );
}

export default function HistoryPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const router = useRouter();

  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.getUser();
      const user = data?.user;

      if (authError || !user) {
        router.push('/login');
        return;
      }

      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (promptsError) {
        setError(promptsError.message);
        setPrompts([]);
      } else {
        setPrompts(promptsData ?? []);
      }

      setLoading(false);
    };

    fetchHistory();
  }, [router]);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    // `.select()` returns the rows actually deleted. Under RLS a delete that
    // matches no policy affects 0 rows *without* raising an error, so checking
    // the returned rows is the only way to know the delete really happened —
    // otherwise a phantom removal would reappear on refresh.
    const { data, error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .select('id');

    if (deleteError) {
      alert('Could not delete: ' + deleteError.message);
      return;
    }
    if (!data || data.length === 0) {
      alert(
        "Could not delete this prompt — it wasn't removed. You may not have permission (missing delete policy)."
      );
      return;
    }
    // Only drop the row from local state once the DB actually deleted it.
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  // Client-side search + format filter over the already-fetched rows.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prompts.filter((p) => {
      const matchesFormat = formatFilter === 'all' || p.format === formatFilter;
      const matchesQuery =
        !q ||
        p.core_idea?.toLowerCase().includes(q) ||
        p.generated_result?.toLowerCase().includes(q);
      return matchesFormat && matchesQuery;
    });
  }, [prompts, query, formatFilter]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">My Prompts</h1>
        <p className="mt-1 text-sm text-muted">
          Your entire history of generated AI blueprints.
        </p>
      </header>

      {/* Search + format filter */}
      {prompts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input
              className="w-full rounded-lg border border-line bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
              placeholder="Search ideas & outputs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {FORMAT_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFormatFilter(f.value)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  formatFilter === f.value
                    ? 'border-accent/30 bg-accent/15 text-accent-ink'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <Card className="flex h-64 items-center justify-center border-danger/40 bg-danger/5 text-sm text-danger">
          {error}
        </Card>
      ) : prompts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="accent-gradient grid h-12 w-12 place-items-center rounded-xl text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">No prompts yet</p>
            <p className="mt-1 text-sm text-muted">
              Head to Discover to generate your first blueprint.
            </p>
          </div>
          <Link
            href="/"
            className="accent-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105"
          >
            <Sparkles className="h-4 w-4" />
            Create a prompt
          </Link>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="flex h-64 items-center justify-center text-sm text-subtle">
          No prompts match your search.
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
