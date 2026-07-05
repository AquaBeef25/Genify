import { cn } from './cn';

// The recurring surface used across the app: hairline border, layered dark
// fill, soft elevation. Consumers add their own padding via className.
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
