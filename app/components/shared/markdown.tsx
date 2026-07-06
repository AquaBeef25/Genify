import type { Components } from "react-markdown";

// Shared markdown styling for generated blueprints so the generator page and
// the history "View" modal render identically. Headings use the serif display
// face with a terracotta accent bar; body stays in the UI sans.
export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 font-serif text-2xl font-bold text-ink first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2.5 mt-6 flex items-center gap-2.5 font-serif text-lg font-bold text-ink first:mt-0">
      <span className="accent-gradient h-4 w-1 shrink-0 rounded-full" />
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 font-serif text-base font-semibold text-accent-ink first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3.5 text-[14.5px] leading-relaxed text-muted">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  ul: ({ children }) => <ul className="mb-3.5 space-y-1.5">{children}</ul>,
  li: ({ children }) => (
    <li className="relative pl-5 text-[14px] leading-relaxed text-muted">
      <span className="absolute left-0 top-[9px] h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </li>
  ),
  hr: () => <hr className="my-6 border-line" />,
  pre: ({ children }) => (
    <pre className="mb-3.5 overflow-x-auto rounded-lg border border-line border-l-[3px] border-l-accent bg-surface-2 p-4 font-mono text-[13px] leading-relaxed text-ink">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[13px] text-accent-ink">{children}</code>
  ),
};
