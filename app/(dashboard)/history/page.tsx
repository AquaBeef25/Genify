'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { createClient } from '../../lib/supabase';

export default function HistoryPage() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-10 text-white">
      <div className="mb-8 border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight">My Prompts</h1>
        <p className="mt-1 text-sm text-zinc-400">Your entire history of generated AI blueprints.</p>
      </div>

      {prompts?.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-sm text-zinc-500">
          No prompts generated yet. Go to Discover to create your first one.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {prompts?.map((prompt) => (
            <div 
              key={prompt.id} 
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-sm transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-4 py-3">
                <span className="rounded-full bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  {prompt.format}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(prompt.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="p-4 text-sm text-zinc-300">
                <div className="mb-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Original Idea</div>
                <p className="mb-6 line-clamp-2 text-zinc-200">"{prompt.core_idea}"</p>
                
                <div className="mb-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">Generated Output</div>
                <div className="h-48 overflow-y-auto rounded-lg bg-zinc-950 p-3 text-xs scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
                  <ReactMarkdown>{prompt.generated_result}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}