import { cn } from './cn';

// Shared form primitives so inputs look identical everywhere.
const controlBase =
  'w-full rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm text-ink placeholder:text-faint transition-colors focus:outline-none focus:border-accent focus:bg-surface focus:ring-2 focus:ring-accent/15';

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'text-xs font-semibold uppercase tracking-wider text-subtle',
        className
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, 'resize-none', className)} {...props} />
  );
}

export function Field({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('grid gap-2', className)}>{children}</div>;
}
