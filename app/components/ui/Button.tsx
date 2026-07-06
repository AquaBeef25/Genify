import { cn } from './cn';
import Spinner from './Spinner';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  // Terracotta gradient is the primary action color (warm & light).
  primary:
    'accent-gradient text-white shadow-sm hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100',
  // Same gradient for secondary-emphasis actions (refine, etc.).
  accent:
    'accent-gradient text-white hover:brightness-105 disabled:opacity-50 disabled:hover:brightness-100',
  secondary:
    'border border-line bg-transparent text-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  ghost:
    'border border-line bg-transparent text-muted hover:bg-surface-2 hover:text-ink disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  md: 'px-4 py-3 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
