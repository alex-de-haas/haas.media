import { useState, useEffect, useCallback } from 'react';
import { metadataApi } from '@/lib/api/metadata';
import type { MovieMetadata, TVShowMetadata } from '@/types/metadata';

export function useMovies(libraryId?: string) {
  const [movies, setMovies] = useState<MovieMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const moviesData = await metadataApi.getMovies(libraryId);
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
      const movieData = await metadataApi.getMovieById(id);
      setMovie(movieData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load movie');
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
      const tvShowsData = await metadataApi.getTVShows(libraryId);
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
      const tvShowData = await metadataApi.getTVShowById(id);
      setTVShow(tvShowData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load TV show');
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
