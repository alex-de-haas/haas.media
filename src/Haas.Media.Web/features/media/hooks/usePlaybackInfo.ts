import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiUrl } from "@/lib/env";
import type { MoviePlaybackInfo, TVShowPlaybackInfo } from "@/types/metadata";

export function useMoviePlaybackInfo(movieId: number | null) {
  const [playbackInfo, setPlaybackInfo] = useState<MoviePlaybackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybackInfo = useCallback(async () => {
    if (movieId == null || movieId <= 0) {
      setPlaybackInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/metadata/movies/${movieId}/playback`);
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to load playback info");
      }

      const data = (await response.json()) as MoviePlaybackInfo;
      setPlaybackInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playback info");
      setPlaybackInfo(null);
    } finally {
      setLoading(false);
    }
  }, [movieId]);

  useEffect(() => {
    void fetchPlaybackInfo();
  }, [fetchPlaybackInfo]);

  return { playbackInfo, loading, error, refetch: fetchPlaybackInfo };
}

export function useTVShowPlaybackInfo(tvShowId: number | null) {
  const [playbackInfo, setPlaybackInfo] = useState<TVShowPlaybackInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybackInfo = useCallback(async () => {
    if (tvShowId == null || tvShowId <= 0) {
      setPlaybackInfo(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`${getApiUrl()}/api/metadata/tvshows/${tvShowId}/playback`);
      if (!response.ok) {
        throw new Error(response.statusText || "Failed to load playback info");
      }

      const data = (await response.json()) as TVShowPlaybackInfo;
      setPlaybackInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load playback info");
      setPlaybackInfo(null);
    } finally {
      setLoading(false);
    }
  }, [tvShowId]);

  useEffect(() => {
    void fetchPlaybackInfo();
  }, [fetchPlaybackInfo]);

  return { playbackInfo, loading, error, refetch: fetchPlaybackInfo };
}
