'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  Settings,
  LogOut,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '../../lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);

  // Show the Moderation link only to the admin. This is cosmetic — the /admin
  // page and the RLS UPDATE policy are the real guards.
  useEffect(() => {
    const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    if (!adminId) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id === adminId) setIsAdmin(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { name: 'Discover', href: '/', icon: LayoutDashboard },
    { name: 'My Prompts', href: '/history', icon: Sparkles },
    { name: 'Community Gallery', href: '/gallery', icon: LayoutGrid },
    { name: 'Share Result', href: '/submit', icon: Upload },
    ...(isAdmin
      ? [{ name: 'Moderation', href: '/admin', icon: ShieldCheck }]
      : []),
    { name: 'Billing', href: '/billing', icon: CreditCard },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-4 text-white">
      <div className="mb-8 flex items-center gap-3 px-2 mt-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight">Architect</span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:bg-red-900/20 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
