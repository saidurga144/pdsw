'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useUIStore } from '@/stores/ui.store';
import { Search, Bell, Menu, Shield, LogOut } from 'lucide-react';
import Link from 'next/link';

export const HeaderNavbar: React.FC = () => {
  const router = useRouter();
  const { user, role, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { toggleSidebar, setSearchOpen } = useUIStore();

  const notificationHref = role === 'BENEFICIARY'
    ? '/beneficiary/notifications'
    : `/${role.toLowerCase()}/dashboard`;

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 text-foreground shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3.5 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground">
            <div className="relative flex size-8 items-center justify-center overflow-hidden rounded-xl border border-primary/50 bg-card shadow-subtle">
              <img
                src="/logo.png"
                alt="PDSW Logo"
                className="size-full object-cover"
              />
            </div>
            <div className="hidden sm:block">
                <span className="display-type block text-base font-bold text-foreground uppercase tracking-wider leading-none">
                PDS Welfare Platform
              </span>
            </div>
          </Link>
        </div>


        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden lg:inline text-[10px] bg-card px-1.5 py-0.5 rounded border border-border text-muted-foreground font-mono">
              Ctrl+K
            </kbd>
          </button>

          <Link
            href={notificationHref}
            className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            )}
          </Link>

          <div className="h-5 w-px bg-border mx-1" />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-xs font-bold text-primary">
              {user?.name?.substring(0, 2).toUpperCase() || '0x'}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">{user?.name}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                <span className="uppercase font-bold text-primary">{role}</span>
                {user?.walletAddress && (
                  <span className="text-muted-foreground bg-muted px-1 py-0.2 rounded text-[9px]">
                    {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="md:hidden px-4 py-1.5 border-t border-border bg-muted/30 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Portal:</span>
          <span className="font-bold text-foreground uppercase">{role}</span>
          <span className="size-1.5 rounded-full bg-primary" />
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
