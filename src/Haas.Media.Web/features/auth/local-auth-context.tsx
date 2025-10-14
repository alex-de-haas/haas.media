"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AuthResponse } from "@/types/auth";

interface LocalUser {
  username: string;
  preferredMetadataLanguage: string;
  countryCode: string;
}

interface LocalAuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: LocalUser | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string) => Promise<boolean>;
  updateProfile: (preferredMetadataLanguage: string, countryCode: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const LocalAuthContext = createContext<LocalAuthContextType | undefined>(undefined);

export function LocalAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      // Verify token by fetching user info BEFORE setting token state
      fetch("/api/local-auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Invalid token");
        })
        .then((data) => {
          // Only set token and user if verification succeeds
          setToken(storedToken);
          setUser({
            username: data.username,
            preferredMetadataLanguage: data.preferredMetadataLanguage ?? "en",
            countryCode: (data.countryCode ?? "US").toUpperCase(),
          });
        })
        .catch(() => {
          // Clear invalid token
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/local-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data: AuthResponse = await res.json();
      setToken(data.token);
      setUser({
        username: data.username,
        preferredMetadataLanguage: data.preferredMetadataLanguage ?? "en",
        countryCode: (data.countryCode ?? "US").toUpperCase(),
      });
      localStorage.setItem("auth_token", data.token);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const register = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/local-auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data: AuthResponse = await res.json();
      setToken(data.token);
      setUser({
        username: data.username,
        preferredMetadataLanguage: data.preferredMetadataLanguage ?? "en",
        countryCode: (data.countryCode ?? "US").toUpperCase(),
      });
      localStorage.setItem("auth_token", data.token);
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      return false;
    }
  };

  const updateProfile = async (
    preferredMetadataLanguage: string,
    countryCode: string,
  ): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    const normalizedCountryCode = countryCode.trim().toUpperCase();

    try {
      const res = await fetch("/api/local-auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferredMetadataLanguage, countryCode: normalizedCountryCode }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        return { success: false, error: errorBody?.error };
      }

      const data: AuthResponse = await res.json();
      setToken(data.token);
      setUser({
        username: data.username,
        preferredMetadataLanguage: data.preferredMetadataLanguage ?? "en",
        countryCode: (data.countryCode ?? "US").toUpperCase(),
      });
      localStorage.setItem("auth_token", data.token);
      return { success: true };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, error: "Failed to update profile" };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!token) {
      return { success: false, error: "Not authenticated" };
    }

    try {
      const res = await fetch("/api/local-auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        return { success: false, error: errorBody?.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Password update error:", error);
      return { success: false, error: "Failed to update password" };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
  };

  return (
    <LocalAuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        user,
        login,
        register,
        updateProfile,
        updatePassword,
        logout,
        isLoading,
      }}
    >
      {children}
    </LocalAuthContext.Provider>
  );
}

export function useLocalAuth() {
  const context = useContext(LocalAuthContext);
  if (context === undefined) {
    throw new Error("useLocalAuth must be used within a LocalAuthProvider");
  }
  return context;
}
