import { cn } from './cn';

// Pulsing placeholder for loading states.
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-2', className)}
      aria-hidden="true"
    />
  );
}
