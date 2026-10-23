'use client';

import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Users, Building2, Send, AlertTriangle, ShieldCheck, Cpu, Database, Lock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const adminName = user?.name || 'Administrator';
  const adminId = user?.id ? `ADM-${user.id.slice(-6).toUpperCase()}` : 'ADM-ROOT';
  const jurisdiction = user?.jurisdiction || 'National Headquarters, New Delhi';

  const trendData = [
    { month: 'Jan', beneficiaries: 1200, transactions: 3400, riskEvents: 12 },
    { month: 'Feb', beneficiaries: 1280, transactions: 3600, riskEvents: 15 },
    { month: 'Mar', beneficiaries: 1350, transactions: 4100, riskEvents: 9 },
    { month: 'Apr', beneficiaries: 1390, transactions: 4300, riskEvents: 22 },
    { month: 'May', beneficiaries: 1420, transactions: 4500, riskEvents: 18 },
    { month: 'Jun', beneficiaries: 1450, transactions: 4800, riskEvents: 31 },
  ];

  const riskPieData = [
    { name: 'Low Risk', value: 85, color: '#6F8A77' },
    { name: 'Medium Risk', value: 10, color: '#D97706' },
    { name: 'High Risk', value: 5, color: '#DC2626' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-secondary text-foreground font-mono text-[11px] px-2.5 py-0.5 rounded border border-border font-bold">
              {adminId}
            </span>
            <span className="text-xs text-muted-foreground">{jurisdiction}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{adminName} — Administrator Control Panel</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/ai-intelligence"
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-subtle transition-all"
          >
            AI Anomaly Engine
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Beneficiaries"
          value="1,450,890"
          description="98.4% Active Status"
          icon={Users}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Today's Transactions"
          value="42,108"
          description="100% IPFS CID Pinned"
          icon={Building2}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Audit Ledger Events"
          value="3,912,440"
          description="Cryptographically Chained"
          icon={ShieldCheck}
          iconBgColor="bg-secondary text-primary border border-border"
        />
        <StatsCard
          title="Security Alerts Today"
          value="4"
          description="SOC Monitored Stream"
          icon={AlertTriangle}
          iconBgColor="bg-secondary text-primary border border-border"
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-md p-5 shadow-subtle space-y-4">
          <h2 className="font-bold text-sm text-foreground">Welfare Distribution & Transaction Velocity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTxn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6F8A77" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6F8A77" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
                <Area type="monotone" dataKey="transactions" stroke="#6F8A77" fillOpacity={1} fill="url(#colorTxn)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-md p-5 shadow-subtle space-y-4">
          <h2 className="font-bold text-sm text-foreground">Risk Distribution Profile</h2>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
