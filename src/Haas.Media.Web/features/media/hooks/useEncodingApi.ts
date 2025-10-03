"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { EncodingProcessInfo, EncodeRequest } from "@/types/encoding";
import type { MediaFileInfo } from "@/types/media-file-info";

/**
 * Hook for interacting with the encoding API endpoints
 * Provides all CRUD operations for encodings as defined in EncodingConfiguration.cs
 */
export function useEncodingApi() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /**
   * Get all active encodings
   * Corresponds to: GET /api/encodings
   */
  const getEncodings = React.useCallback(async (): Promise<EncodingProcessInfo[]> => {
    setLoading(true);
    setError(null);
    try {
      const t = await getValidToken();
      const headers: HeadersInit = {};
      if (t) (headers as any).Authorization = `Bearer ${t}`;

      const res = await fetch(`${downloaderApi}/api/encodings`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      const data = await res.json();
      return data ?? [];
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get media files for a specific hash
   * Corresponds to: GET /api/encodings/{hash}
   */
  const getMediaFiles = React.useCallback(async (hash: string): Promise<MediaFileInfo[]> => {
    setLoading(true);
    setError(null);
    try {
      const t = await getValidToken();
      const headers: HeadersInit = {};
      if (t) (headers as any).Authorization = `Bearer ${t}`;

      const res = await fetch(`${downloaderApi}/api/encodings/${hash}`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Start encoding for a specific hash
   * Corresponds to: POST /api/encodings/{hash}
   */
  const startEncoding = React.useCallback(async (hash: string, request: EncodeRequest): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const t = await getValidToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (t) (headers as any).Authorization = `Bearer ${t}`;

      const res = await fetch(`${downloaderApi}/api/encodings/${hash}`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      // Backend returns 200 OK with no content on success
      return;
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Stop and delete encoding for a specific hash
   * Corresponds to: DELETE /api/encodings/{hash}
   */
  const stopEncoding = React.useCallback(async (hash: string): Promise<void> => {
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

      // Backend returns 200 OK with no content on success
      return;
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getEncodings,
    getMediaFiles,
    startEncoding,
    stopEncoding,
    loading,
    error,
  } as const;
}
