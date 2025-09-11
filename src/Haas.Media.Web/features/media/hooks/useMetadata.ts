import { useState, useEffect, useCallback } from 'react';
import { getValidToken } from '@/lib/auth/token';
import { getApiDownloaderUrl } from '@/lib/env';
import type { MovieMetadata, TVShowMetadata, SearchResult } from '@/types/metadata';
import type { LibraryType } from '@/types/library';

export interface AddToLibraryRequest {
  type: LibraryType;
  libraryId: string;
  tmdbId: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getValidToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

export function useAddToLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToLibrary = useCallback(async (request: AddToLibraryRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/add-to-library`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to library';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { addToLibrary, loading, error };
}

export function useMovies(libraryId?: string) {
  const [movies, setMovies] = useState<MovieMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/movies`);
      if (libraryId) {
        url.searchParams.set('libraryId', libraryId);
      }
      
      const response = await fetchWithAuth(url.toString());
      const moviesData = await response.json();
      setMovies(moviesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  return { movies, loading, error, refetch: fetchMovies };
}

export function useMovie(id: string) {
  const [movie, setMovie] = useState<MovieMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovie = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/movies/${id}`);
      const movieData = await response.json();
      setMovie(movieData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setMovie(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load movie');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchMovie();
    }
  }, [fetchMovie, id]);

  return { movie, loading, error, refetch: fetchMovie };
}

export function useTVShows(libraryId?: string) {
  const [tvShows, setTVShows] = useState<TVShowMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTVShows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/tvshows`);
      if (libraryId) {
        url.searchParams.set('libraryId', libraryId);
      }
      
      const response = await fetchWithAuth(url.toString());
      const tvShowsData = await response.json();
      setTVShows(tvShowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load TV shows');
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    fetchTVShows();
  }, [fetchTVShows]);

  return { tvShows, loading, error, refetch: fetchTVShows };
}

export function useTVShow(id: string) {
  const [tvShow, setTVShow] = useState<TVShowMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTVShow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/tvshows/${id}`);
      const tvShowData = await response.json();
      setTVShow(tvShowData);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setTVShow(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load TV show');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchTVShow();
    }
  }, [fetchTVShow, id]);

  return { tvShow, loading, error, refetch: fetchTVShow };
}

export function useScanLibraries() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanLibraries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/scan`, {
        method: 'POST',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to scan libraries';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { scanLibraries, loading, error };
}

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, libraryType?: LibraryType): Promise<SearchResult[]> => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/search`);
      url.searchParams.set('query', query);
      if (libraryType !== undefined) {
        url.searchParams.set('libraryType', libraryType.toString());
      }
      
      const response = await fetchWithAuth(url.toString());
      const searchResults = await response.json();
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, loading, error };
}
