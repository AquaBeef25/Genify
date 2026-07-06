'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  LogOut,
  LayoutDashboard,
  LayoutGrid,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '../../lib/supabase';
import { cn } from '../ui/cn';
import Brand from './Brand';

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // Load the signed-in user once: drives the identity block, and the admin-only
  // Moderation link. This is cosmetic — the /admin page and the RLS UPDATE
  // policy are the real guards.
  useEffect(() => {
    const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    supabase.auth.getUser().then(({ data }) => {
      const user = data?.user;
      if (!user) return;
      setEmail(user.email ?? null);
      if (adminId && user.id === adminId) setIsAdmin(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const groups = [
    {
      label: 'Create',
      items: [
        { name: 'Discover', href: '/', icon: LayoutDashboard },
        { name: 'My Prompts', href: '/history', icon: Sparkles },
      ],
    },
    {
      label: 'Community',
      items: [
        { name: 'Community Gallery', href: '/gallery', icon: LayoutGrid },
        { name: 'Share Result', href: '/submit', icon: Upload },
        ...(isAdmin
          ? [{ name: 'Moderation', href: '/admin', icon: ShieldCheck }]
          : []),
      ],
    },
  ];

  const name = email ? email.split('@')[0] : 'Account';
  const initial = email ? email[0]!.toUpperCase() : 'G';

  return (
    <aside className="flex h-screen w-[280px] flex-col gap-2 border-r border-line bg-surface-2 p-4">
      <Brand className="px-2 pb-4 pt-2" />

      <nav className="flex-1 space-y-6 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'border-accent/30 bg-accent/10 text-ink'
                        : 'text-muted hover:bg-surface hover:text-ink'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[17px] w-[17px]',
                        isActive ? 'text-accent' : 'text-subtle'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl border border-line bg-surface p-2.5">
        <span className="accent-gradient grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-sm font-semibold text-white">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold capitalize text-ink">
            {name}
          </div>
          <div className="truncate text-[11px] text-subtle">
            {email ?? 'Not signed in'}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
