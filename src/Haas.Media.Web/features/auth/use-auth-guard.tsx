"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalAuth } from "./local-auth-context";

/**
 * Hook to protect routes that require authentication.
 * Redirects to login page if user is not authenticated.
 * 
 * @returns Object containing authentication state and loading indicator
 */
export function useAuthGuard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useLocalAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook to redirect authenticated users away from public pages (login, register).
 * Redirects to home page if user is already authenticated.
 * 
 * @returns Object containing authentication state and loading indicator
 */
export function useGuestGuard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useLocalAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  return { isAuthenticated, isLoading };
}
