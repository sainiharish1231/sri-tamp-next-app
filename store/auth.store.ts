// stores/useAuthStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { extractPartyId, normalizeRole } from "@/utils/access";

interface AuthSession {
  user: {
    id: string;
    name: string;
    phone?: string;
    role?: string;
    partyId?: string;
    balance?: number;
    currentBalance?: number;
    openingBalance?: number;
    balanceType?: string;
    email?: string;
    address?: string;
    token?: string;
    [key: string]: any;
  } | null;
  token: string | null;
  timestamp: string;
}

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (userData: any) => Promise<void>;
  clearSession: () => Promise<void>;
  loadSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      isLoading: true,
      isAuthenticated: false,

      setSession: async (userData: any) => {
        try {
          console.log("💾 Saving session:", userData);

          const rawUser = userData.user || userData;
          const normalizedRole = normalizeRole(
            userData.role || rawUser?.role,
          );
          const normalizedPartyId = extractPartyId(rawUser);

          const session: AuthSession = {
            user: {
              ...rawUser,
              id: userData.id || rawUser?.id,
              name: userData.name || rawUser?.name,
              role: normalizedRole || rawUser?.role,
              phone: userData.phone || rawUser?.phone,
              partyId: normalizedPartyId,
              token: userData.token || rawUser?.token,
            },
            token: userData.token || rawUser?.token,
            timestamp: new Date().toISOString(),
          };

          await AsyncStorage.setItem("authData", JSON.stringify(session));
          set({
            session,
            isAuthenticated: true,
            isLoading: false,
          });
          console.log("✅ Session saved successfully");
        } catch (error) {
          console.error("❌ Failed to save session:", error);
          throw error;
        }
      },

      clearSession: async () => {
        try {
          await AsyncStorage.removeItem("authData");
          console.log("🧹 Session cleared");
          set({
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ Failed to clear session:", error);
        }
      },

      loadSession: async () => {
        try {
          set({ isLoading: true });
          console.log("🔍 Loading session...");

          const data = await AsyncStorage.getItem("authData");
          console.log("📦 Raw authData:", data);

          if (data) {
            const parsedSession: AuthSession = JSON.parse(data);
            const session: AuthSession = {
              ...parsedSession,
              user: parsedSession.user
                ? {
                    ...parsedSession.user,
                    role:
                      normalizeRole(parsedSession.user.role) ||
                      parsedSession.user.role,
                    partyId: extractPartyId(parsedSession.user),
                  }
                : null,
            };

            // Check if session is expired (optional - 30 days)
            const now = new Date();
            const sessionTime = new Date(session.timestamp);
            const isExpired =
              now.getTime() - sessionTime.getTime() > 30 * 24 * 60 * 60 * 1000;

            if (!isExpired && session.user && session.token) {
              set({
                session,
                isAuthenticated: true,
                isLoading: false,
              });
              console.log("✅ Session loaded:", session.user.name);
              return;
            } else {
              console.log("⚠️ Session expired or invalid");
              await get().clearSession();
            }
          } else {
            console.log("❌ No session data found");
          }

          set({
            session: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error("❌ Failed to load session:", error);
          await get().clearSession();
        }
      },

      refreshSession: async () => {
        const { session } = get();
        if (session?.token) {
          console.log("🔄 Session refreshed");
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: (state) => {
        console.log("💧 Zustand rehydration complete:", state);
      },
    },
  ),
);
