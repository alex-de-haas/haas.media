"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";

export function useEncodingActions() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stopEncoding = React.useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    try {
      const t = await getValidToken();
      const headers: HeadersInit = {};
      if (t) (headers as any).Authorization = `Bearer ${t}`;
      
      const res = await fetch(`${downloaderApi}/api/encodings/${hash}`, {
        method: "DELETE",
        headers,
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }
      
      return;
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stopEncoding, loading, error } as const;
}
