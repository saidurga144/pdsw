'use client';

import React from 'react';
import { useNotificationStore } from '@/stores/notification.store';
import { CheckCheck, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="ben-title text-foreground">Notifications</h1>
          <p className="text-xs text-muted-foreground">
            Security alerts, eligibility updates, and transaction confirmations
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-md border border-border flex items-center gap-1.5 transition-colors"
        >
          <CheckCheck className="size-4 text-primary" /> Mark All as Read
        </button>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-card border border-border rounded-md p-10 text-center space-y-2 shadow-subtle">
            <Bell className="size-8 text-muted-foreground mx-auto opacity-40" />
            <p className="text-sm font-semibold text-foreground">No Notifications</p>
            <p className="text-xs text-muted-foreground">You have no new notifications at this time.</p>
          </div>
        ) : (
          notifications.map((ntf) => (
            <div
              key={ntf.id}
              onClick={() => markAsRead(ntf.id)}
              className={`p-4 rounded-md border transition-all cursor-pointer space-y-2 shadow-subtle ${
                !ntf.read
                  ? 'bg-card border-primary/40'
                  : 'bg-muted/30 border-border opacity-70'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold bg-secondary px-2 py-0.5 rounded text-primary border border-border">
                  {ntf.category}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ntf.timestamp).toLocaleString()}
                </span>
              </div>

              <h3 className="ben-subsection-title text-foreground">{ntf.title}</h3>
              <p className="text-xs text-muted-foreground">{ntf.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
