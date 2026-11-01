import { create } from "zustand";
import { Notification } from "@/types";
import { apiClient } from "@/services/api/client";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  loadNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get("/beneficiary/notifications");
      const rows = response.data?.notifications;
      if (!response.data?.success || !Array.isArray(rows)) {
        throw new Error("Notification service returned an invalid response.");
      }
      const notifications: Notification[] = rows.map((row: any) => ({
        id: row.id,
        category: row.type === "WARNING" ? "SECURITY" : row.resourceType === "DISTRIBUTION" ? "DISTRIBUTION" : "BENEFICIARY",
        title: row.title,
        message: row.message,
        timestamp: row.timestamp,
        read: Boolean(row.read),
        priority: row.type === "WARNING" ? "HIGH" : "NORMAL",
        linkUrl: row.resourceType === "CHANGE_REQUEST" ? "/beneficiary/requests" : row.resourceType === "DISTRIBUTION" ? "/beneficiary/transactions" : undefined,
      }));
      set({ notifications, unreadCount: notifications.filter((item) => !item.read).length, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Could not load notifications." });
    }
  },

  markAsRead: async (id) => {
    try {
      await apiClient.patch(`/beneficiary/notifications/${encodeURIComponent(id)}`);
      const notifications = get().notifications.map((item) => item.id === id ? { ...item, read: true } : item);
      set({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not update notification." });
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.patch("/beneficiary/notifications");
      set({ notifications: get().notifications.map((item) => ({ ...item, read: true })), unreadCount: 0 });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not update notifications." });
    }
  },

  clear: () => set({ notifications: [], unreadCount: 0, isLoading: false, error: null }),
}));
