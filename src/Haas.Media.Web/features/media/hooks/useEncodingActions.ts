"use client";

import React from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";

export function useEncodingActions() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const stopEncoding = React.useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/encodings/${hash}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stopEncoding, loading, error } as const;
}
