import { create } from "zustand";

export interface UserProfile {
  id: string;
  username: string;
  role: "admin" | "user" | "pending";
}

interface AuthStoreState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isPending: boolean;
  isAdmin: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  initialize: () => void;
}

function parseJwt(token: string): UserProfile | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload) as UserProfile;
  } catch (e) {
    return null;
  }
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isPending: false,
  isAdmin: false,

  setToken: (token) => {
    localStorage.setItem("token", token);
    const user = parseJwt(token);
    set({
      token,
      user,
      isAuthenticated: !!user,
      isPending: user?.role === "pending",
      isAdmin: user?.role === "admin",
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isPending: false,
      isAdmin: false,
    });
  },

  initialize: () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isPending: false,
        isAdmin: false,
      });
      return;
    }

    const user = parseJwt(token);
    if (!user) {
      localStorage.removeItem("token");
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isPending: false,
        isAdmin: false,
      });
      return;
    }

    // Optional expiration check
    try {
      const parts = token.split(".");
      const payload = JSON.parse(window.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isPending: false,
          isAdmin: false,
        });
        return;
      }
    } catch {
      // ignore check if base64 dec fails
    }

    set({
      token,
      user,
      isAuthenticated: true,
      isPending: user.role === "pending",
      isAdmin: user.role === "admin",
    });
  },
}));
