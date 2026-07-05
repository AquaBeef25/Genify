'use client';

import { cn } from './cn';

// Accessible toggle used for the storyboard option.
export default function Switch({
  checked,
  onChange,
  id,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
        checked
          ? 'accent-gradient border-transparent'
          : 'border-line-strong bg-elevated'
      )}
    >
      <span
        className={cn(
          'absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full transition-transform',
          checked ? 'translate-x-5 bg-white' : 'bg-muted'
        )}
      />
    </button>
  );
}
