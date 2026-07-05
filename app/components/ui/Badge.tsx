import { cn } from './cn';

// Small pill for format labels and status. Defaults to the accent tint;
// pass className to override colors (e.g. per-format hues).
export default function Badge({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-accent-ink',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
