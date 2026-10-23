'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { normalizeRole } from '@/lib/role-utils';
import {
  Home,
  Users,
  Send,
  History,
  UserCheck,
  LayoutDashboard,
  FileCheck,
  AlertTriangle,
  ShieldCheck,
  Search,
  Bell,
  Settings,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const { role } = useAuthStore();
  const pathname = usePathname();

  const beneficiaryNav = [
    { href: '/beneficiary/dashboard', label: 'Home', icon: Home },
    { href: '/beneficiary/family', label: 'Family', icon: Users },
    { href: '/beneficiary/requests', label: 'Services', icon: Send },
    { href: '/beneficiary/transactions', label: 'History', icon: History },
    { href: '/beneficiary/profile', label: 'Profile', icon: UserCheck },
    { href: '/beneficiary/settings', label: 'Settings', icon: Settings },
  ];

  const officerNav = [
    { href: '/officer/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/officer/beneficiaries', label: 'Citizens', icon: Users },
    { href: '/officer/verification', label: 'Verify', icon: FileCheck },
    { href: '/officer/alerts', label: 'Alerts', icon: AlertTriangle },
    { href: '/officer/distribution', label: 'Release', icon: Send },
  ];

  const adminNav = [
    { href: '/admin/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/admin/ai-intelligence', label: 'AI Risk', icon: AlertTriangle },
    { href: '/admin/integrity', label: 'Integrity', icon: ShieldCheck },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const canonicalRole = normalizeRole(role || '');
  let navItems = beneficiaryNav;
  if (canonicalRole === 'PDS_OFFICER') navItems = officerNav;
  if (canonicalRole === 'ADMIN' || canonicalRole === 'SOC_ANALYST') navItems = adminNav;

  return (
    <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[94vw] w-auto">
      <nav className="bg-card/95 backdrop-blur-md border border-border rounded-full px-2 py-1 shadow-elevated flex items-center justify-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/beneficiary/dashboard' && item.href !== '/officer/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center min-w-[50px] py-1 px-2 rounded-full text-[10px] font-medium transition-all',
                isActive
                  ? 'bg-secondary text-primary font-bold shadow-subtle'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Icon className={clsx('w-4 h-4 mb-0.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="leading-none text-[9px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
