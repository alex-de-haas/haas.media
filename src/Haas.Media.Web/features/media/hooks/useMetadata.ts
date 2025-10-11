import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiDownloaderUrl } from "@/lib/env";
import type {
  MovieMetadata,
  TVShowMetadata,
  SearchResult,
  AddToLibraryResponse,
  AddToLibraryOperationInfo,
  PersonMetadata,
  PersonLibraryCredits,
} from "@/types/metadata";
import { LibraryType } from "@/types/library";
import { BackgroundTaskStatus } from "@/types";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";

export interface AddToLibraryRequest {
  type: LibraryType;
  libraryId: string;
  id: number;
}

export function useAddToLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToLibrary = useCallback(async (request: AddToLibraryRequest): Promise<AddToLibraryResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/add-to-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const result = (await response.json()) as AddToLibraryResponse;
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add to library";
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
  const processedTaskIdsRef = useRef<Set<string>>(new Set());
  const { tasks: backgroundTasks } = useBackgroundTasks({ enabled: true });

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/movies`);
      if (libraryId) {
        url.searchParams.set("libraryId", libraryId);
      }

      const response = await fetchWithAuth(url.toString());
      const moviesData = await response.json();
      setMovies(moviesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movies");
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    if (backgroundTasks.length === 0) {
      processedTaskIdsRef.current.clear();
      return;
    }

    const processedTaskIds = processedTaskIdsRef.current;
    let shouldRefetch = false;

    for (const task of backgroundTasks) {
      if (task.type !== "AddToLibraryTask" || task.status !== BackgroundTaskStatus.Completed) {
        continue;
      }

      if (processedTaskIds.has(task.id)) {
        continue;
      }

      const payload = task.payload as AddToLibraryOperationInfo | undefined;
      if (!payload || payload.libraryType !== LibraryType.Movies) {
        continue;
      }

      if (libraryId && payload.libraryId !== libraryId) {
        continue;
      }

      processedTaskIds.add(task.id);
      shouldRefetch = true;
    }

    if (shouldRefetch) {
      void fetchMovies();
    }
  }, [backgroundTasks, fetchMovies, libraryId]);

  useEffect(() => {
    void fetchMovies();
  }, [fetchMovies]);

  return { movies, loading, error, refetch: fetchMovies };
}

export function useMovie(id: number) {
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
      if (err instanceof Error && err.message.includes("404")) {
        setMovie(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load movie");
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

export function useDeleteMovieMetadata() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteMovie = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/movies/${id}`, {
        method: "DELETE",
      });

      return { success: true, message: "Movie deleted successfully" };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete movie";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteMovie, loading, error };
}

export function useTVShows(libraryId?: string) {
  const [tvShows, setTVShows] = useState<TVShowMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processedTaskIdsRef = useRef<Set<string>>(new Set());
  const { tasks: backgroundTasks } = useBackgroundTasks({ enabled: true });

  const fetchTVShows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/tvshows`);
      if (libraryId) {
        url.searchParams.set("libraryId", libraryId);
      }

      const response = await fetchWithAuth(url.toString());
      const tvShowsData = await response.json();
      setTVShows(tvShowsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load TV shows");
    } finally {
      setLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    if (backgroundTasks.length === 0) {
      processedTaskIdsRef.current.clear();
      return;
    }

    const processedTaskIds = processedTaskIdsRef.current;
    let shouldRefetch = false;

    for (const task of backgroundTasks) {
      if (task.type !== "AddToLibraryTask" || task.status !== BackgroundTaskStatus.Completed) {
        continue;
      }

      if (processedTaskIds.has(task.id)) {
        continue;
      }

      const payload = task.payload as AddToLibraryOperationInfo | undefined;
      if (!payload || payload.libraryType !== LibraryType.TVShows) {
        continue;
      }

      if (libraryId && payload.libraryId !== libraryId) {
        continue;
      }

      processedTaskIds.add(task.id);
      shouldRefetch = true;
    }

    if (shouldRefetch) {
      void fetchTVShows();
    }
  }, [backgroundTasks, fetchTVShows, libraryId]);

  useEffect(() => {
    void fetchTVShows();
  }, [fetchTVShows]);

  return { tvShows, loading, error, refetch: fetchTVShows };
}

export function useTVShow(id: number) {
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
      if (err instanceof Error && err.message.includes("404")) {
        setTVShow(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load TV show");
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

export function usePerson(id?: number) {
  const [person, setPerson] = useState<PersonMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerson = useCallback(async () => {
    if (!id) {
      setPerson(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/people/${id}`);

      if (response.status === 404) {
        setPerson(null);
        setError(null);
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = (errorBody as { message?: string } | null)?.message ?? response.statusText;
        throw new Error(message || "Failed to load person");
      }

      const personData = (await response.json()) as PersonMetadata;
      setPerson(personData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load person");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchPerson();
  }, [fetchPerson]);

  return { person, loading, error, refetch: fetchPerson };
}

export function usePersonCredits(id?: number) {
  const [movies, setMovies] = useState<MovieMetadata[]>([]);
  const [tvShows, setTvShows] = useState<TVShowMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!id) {
      setMovies([]);
      setTvShows([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/people/${id}/credits`);

      if (response.status === 404) {
        setMovies([]);
        setTvShows([]);
        setError(null);
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = (errorBody as { message?: string } | null)?.message ?? response.statusText;
        throw new Error(message || "Failed to load person credits");
      }

      const credits = (await response.json()) as PersonLibraryCredits;
      setMovies(credits.movies ?? []);
      setTvShows(credits.tvShows ?? []);
    } catch (err) {
      setMovies([]);
      setTvShows([]);
      setError(err instanceof Error ? err.message : "Failed to load person credits");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchCredits();
  }, [fetchCredits]);

  return { movies, tvShows, loading, error, refetch: fetchCredits };
}

export function useDeleteTVShowMetadata() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTVShow = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/tvshows/${id}`, {
        method: "DELETE",
      });

      return { success: true, message: "TV show deleted successfully" };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete TV show";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteTVShow, loading, error };
}

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, libraryType?: LibraryType): Promise<SearchResult[]> => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/search`);
      url.searchParams.set("query", query);
      if (libraryType !== undefined) {
        url.searchParams.set("libraryType", libraryType.toString());
      }

      const response = await fetchWithAuth(url.toString());
      const searchResults = await response.json();
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return { search, loading, error };
}
