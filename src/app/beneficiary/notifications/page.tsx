'use client';

import React from 'react';
import { useNotificationStore } from '@/stores/notification.store';
import { Bell, CheckCheck, ShieldAlert, Cpu, CheckCircle } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Unified Notification Center</h1>
          <p className="text-xs text-slate-400">Security alerts, eligibility updates, and transaction confirmations</p>
        </div>

        <button
          onClick={markAllAsRead}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-cyan-400" /> Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.map((ntf) => (
          <div
            key={ntf.id}
            onClick={() => markAsRead(ntf.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
              !ntf.read
                ? 'bg-slate-900 border-cyan-500/60 shadow-md'
                : 'bg-slate-950 border-slate-800 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
                {ntf.category}
              </span>
              <span className="text-[10px] text-slate-500">{new Date(ntf.timestamp).toLocaleString()}</span>
            </div>

            <h3 className="font-bold text-sm text-slate-100">{ntf.title}</h3>
            <p className="text-xs text-slate-300">{ntf.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
