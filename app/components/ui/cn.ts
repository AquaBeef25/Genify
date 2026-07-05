// Tiny classnames joiner — avoids pulling in clsx for a project with no
// existing utility deps.
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}
