import { Sparkles } from 'lucide-react';
import { cn } from '../ui/cn';

// Genify wordmark + gradient mark. Single source of truth for the logo so the
// sidebar and mobile top bar stay in sync.
export default function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="accent-gradient grid h-8 w-8 place-items-center rounded-[10px] text-white shadow-[0_6px_18px_-6px_var(--color-accent-2)]">
        <Sparkles className="h-[18px] w-[18px]" />
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">
        Genify<span className="text-accent">.</span>
      </span>
    </div>
  );
}
