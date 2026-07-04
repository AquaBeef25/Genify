'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { createClient } from '../../lib/supabase';
import PromptCard, { type Prompt } from '../../components/shared/PromptCard';

const FORMAT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'commercial', label: 'Commercial' },
];

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
    const { error: deleteError } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      alert('Could not delete: ' + deleteError.message);
      return;
    }
    // Optimistically drop the row from local state.
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
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10 text-white">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Prompts</h1>
        <p className="mt-1 text-sm text-zinc-400">Your entire history of generated AI blueprints.</p>
      </div>

      {/* Search + format filter */}
      {prompts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  formatFilter === f.value
                    ? 'bg-white text-black'
                    : 'border border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
          Loading your prompts...
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-red-900/50 bg-red-950/10 text-sm text-red-400">
          {error}
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-sm text-zinc-500">
          No prompts generated yet. Go to Discover to create your first one.
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-sm text-zinc-500">
          No prompts match your search.
        </div>
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
