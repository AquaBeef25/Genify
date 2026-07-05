'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './sidebar';
import Brand from './Brand';
import { cn } from '../ui/cn';

// Responsive frame: on md+ the sidebar is a static column; on mobile it becomes
// a slide-over toggled from a top bar. Owns the open/close state so the top bar,
// backdrop, and sidebar stay in sync.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas text-ink">
      {/* Backdrop (mobile only) */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-black/55 transition-opacity md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* Sidebar: slide-over on mobile, static on md+ */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 transition-transform md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      {/* Right column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-surface text-ink transition-colors hover:bg-surface-2"
          >
            <Menu className="h-[19px] w-[19px]" />
          </button>
          <Brand />
        </div>

        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
