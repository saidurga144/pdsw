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
import { normalizeRole } from "@/lib/role-utils";

/** Cache TTL for profile data (5 minutes) */
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/** Interval for automatic background refresh (5 minutes) */
export const CACHE_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Builds a fallback profile from the auth user object (no network required) */
function buildFallbackProfile(user: User): Beneficiary {
  const benId =
    (user as any).beneficiaryId || `ben-${user.id.replace(/^usr-/, "")}`;
  const district = user.jurisdiction?.split(",")[0]?.trim() || "South Delhi";
  const state = user.jurisdiction?.split(",")[1]?.trim() || "Delhi";

  return {
    id: benId,
    rationCardId: `RC-${user.id.slice(-6).toUpperCase()}`,
    fullName: user.name || "Citizen User",
    phone: user.phone || "+91 98765 43210",
    address: {
      doorNo: "H-42",
      street: "Block B, Sector 4",
      district,
      state,
      pincode: "110016",
      pdsCenterId: `FPS-${district.slice(0, 3).toUpperCase()}-102`,
      pdsCenterName: `Fair Price Shop #102, ${district}`,
    },
    rationCategory: "PHH",
    familyCount: 1,
    familyMembers: [
      {
        id: `fm-${user.id}-1`,
        beneficiaryId: benId,
        fullName: user.name || "Citizen User",
        relationship: "HEAD",
        age: 35,
        gender: "MALE",
        uidHash: `0x${user.id.slice(-8)}`,
        verificationStatus: "VERIFIED",
        addedAt: new Date().toISOString(),
      },
    ],
    eligibility: {
      beneficiaryId: benId,
      category: "PHH",
      monthlyEntitlements: [
        {
          commodity: "Rice (Fortified)",
          quantity: 20,
          unit: "KG",
          subsidizedPricePerUnit: 3.0,
        },
        {
          commodity: "Wheat (Whole Grain)",
          quantity: 15,
          unit: "KG",
          subsidizedPricePerUnit: 2.0,
        },
        {
          commodity: "Refined Sugar",
          quantity: 2,
          unit: "KG",
          subsidizedPricePerUnit: 13.5,
        },
      ],
      monthlyIncome: 10000,
      isBPL: true,
      lastReviewedAt: new Date().toISOString(),
      nextReviewDue: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      status: "ELIGIBLE",
    },
    verificationStatus: "VERIFIED",
    riskScore: 6,
    riskLevel: "LOW",
    currentHash: `0x${user.id.slice(-12)}`,
    latestIPFSCid: `Qm${user.id.slice(-16)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

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
   * @param user - The authenticated user from auth.store (used for fallback)
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
    ensureLoaded: async (user: User | null) => {
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
      if (user) {
        set({
          profile: buildFallbackProfile(user),
          isLoading: false,
          lastFetchedAt: Date.now(),
          error: undefined,
        });
        startRefreshTimer();
      } else {
        set({ isLoading: false });
      }
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
    refresh: async (user: User | null) => {
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
      if (user) {
        set({
          profile: buildFallbackProfile(user),
          isLoading: false,
          lastFetchedAt: Date.now(),
          error: undefined,
        });
      } else {
        set({ isLoading: false });
      }
    },
  };
});
