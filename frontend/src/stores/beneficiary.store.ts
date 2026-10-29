/**
 * Beneficiary Profile Cache Store
 *
 * Caches the authenticated beneficiary's profile data in memory so that
 * navigating between dashboard pages (Profile, Family, Eligibility, etc.)
 * does NOT trigger a redundant network request each time.
 *
 * Flow:
 *   First page visit  → fetch from API → store in Zustand memory
 *   Subsequent visits → read from Zustand memory (0ms, no network)
 *   Logout            → cache cleared via clearProfile()
 *   Stale data (>5m)  → background re-fetch via ensureLoaded()
 */
import { create } from "zustand";
import { Beneficiary, User } from "@/types";
import { apiClient } from "@/services/api/client";

/** Cache TTL for profile data (5 minutes) */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** Interval for automatic background refresh (5 minutes) */
export const CACHE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** State interface for the Beneficiary store */
export interface BeneficiaryStoreState {
  /** Cached beneficiary profile — null until first load */
  profile: Beneficiary | null;
  /** True only during the initial fetch (not during background refreshes) */
  isLoading: boolean;
  /** Timestamp of the last successful fetch — used for TTL checks */
  lastFetchedAt: number | null;
  /** Optional error message from the last API failure */
  error?: string;

  /**
   * Ensures the profile is loaded. If already cached and fresh, returns
   * immediately without any network request. If stale or missing, fetches.
   *
   * @param user - Authenticated user (retained for API compatibility)
   */
  ensureLoaded: (user: User | null) => Promise<void>;

  /** Clears cached data — call on logout so stale data is never served */
  clearProfile: () => void;

  /** Force a fresh fetch regardless of cache TTL */
  refresh: (user: User | null) => Promise<void>;
}

/** Zustand store for beneficiary profile */
export const useBeneficiaryStore = create<BeneficiaryStoreState>((set, get) => {
  // Background refresh interval – cleared on logout via clearProfile
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  const startRefreshTimer = () => {
    if (refreshInterval) return;
    refreshInterval = setInterval(() => {
      // Refresh using stored user if available (null will fallback to existing cache)
      get().refresh(null);
    }, CACHE_REFRESH_INTERVAL_MS);
  };

  const stopRefreshTimer = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  return {
    profile: null,
    isLoading: false,
    lastFetchedAt: null,
    error: undefined,

    /** Load profile if needed. Handles TTL and concurrent loads. */
    ensureLoaded: async (_user: User | null) => {
      const { profile, isLoading, lastFetchedAt } = get();
      const isFresh =
        profile !== null &&
        lastFetchedAt !== null &&
        Date.now() - lastFetchedAt < CACHE_TTL_MS;
      if (isFresh || isLoading) return;
      const isFirstLoad = profile === null;
      if (isFirstLoad) set({ isLoading: true, error: undefined });
      try {
        const res = await apiClient.get("/beneficiary/profile");
        if (res.data?.success && res.data.profile) {
          set({
            profile: res.data.profile,
            isLoading: false,
            lastFetchedAt: Date.now(),
            error: undefined,
          });
          startRefreshTimer();
          return;
        }
      } catch (e: any) {
        set({ error: e?.message || "Failed to fetch profile" });
      }
      set({ isLoading: false, error: get().error || "Beneficiary profile is unavailable." });
    },

    clearProfile: () => {
      stopRefreshTimer();
      set({
        profile: null,
        isLoading: false,
        lastFetchedAt: null,
        error: undefined,
      });
    },

    /** Force a fresh fetch, optionally using a fallback user. */
    refresh: async (_user: User | null) => {
      set({ isLoading: true, error: undefined });
      try {
        const res = await apiClient.get("/beneficiary/profile");
        if (res.data?.success && res.data.profile) {
          set({
            profile: res.data.profile,
            isLoading: false,
            lastFetchedAt: Date.now(),
            error: undefined,
          });
          return;
        }
      } catch (e: any) {
        set({ error: e?.message || "Failed to refresh profile" });
      }
      set({ isLoading: false, error: get().error || "Beneficiary profile is unavailable." });
    },
  };
});
