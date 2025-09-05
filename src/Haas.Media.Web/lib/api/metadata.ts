import { downloaderApi } from "@/lib/api";
import type { MovieMetadata, TVShowMetadata, SearchResult } from "@/types/metadata";
import type { LibraryType } from "@/types/library";

export interface MetadataApiClient {
  getMovies: (libraryId?: string) => Promise<MovieMetadata[]>;
  getMovieById: (id: string) => Promise<MovieMetadata | null>;
  getTVShows: (libraryId?: string) => Promise<TVShowMetadata[]>;
  getTVShowById: (id: string) => Promise<TVShowMetadata | null>;
  scanLibraries: () => Promise<void>;
  addToLibrary: (request: AddToLibraryRequest) => Promise<MovieMetadata | TVShowMetadata>;
  search: (query: string, libraryType?: LibraryType) => Promise<SearchResult[]>;
}

export interface AddToLibraryRequest {
  type: LibraryType;
  libraryId: string;
  tmdbId: string;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

export const metadataApi: MetadataApiClient = {
  async getMovies(libraryId?: string): Promise<MovieMetadata[]> {
    const url = new URL('/api/metadata/movies', window.location.origin);
    if (libraryId) {
      url.searchParams.set('libraryId', libraryId);
    }

    const response = await fetchWithAuth(url.toString());
    return response.json();
  },

  async getMovieById(id: string): Promise<MovieMetadata | null> {
    try {
      const response = await fetchWithAuth(`/api/metadata/movies/${id}`);
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async getTVShows(libraryId?: string): Promise<TVShowMetadata[]> {
    const url = new URL('/api/metadata/tvshows', window.location.origin);
    if (libraryId) {
      url.searchParams.set('libraryId', libraryId);
    }

    const response = await fetchWithAuth(url.toString());
    return response.json();
  },

  async getTVShowById(id: string): Promise<TVShowMetadata | null> {
    try {
      const response = await fetchWithAuth(`/api/metadata/tvshows/${id}`);
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  async scanLibraries(): Promise<void> {
    await fetchWithAuth('/api/metadata/scan', {
      method: 'POST',
    });
  },

  async addToLibrary(request: AddToLibraryRequest): Promise<MovieMetadata | TVShowMetadata> {
    const response = await fetchWithAuth('/api/metadata/add-to-library', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response.json();
  },

  async search(query: string, libraryType?: LibraryType): Promise<SearchResult[]> {
    const url = new URL('/api/metadata/search', window.location.origin);
    url.searchParams.set('query', query);
    if (libraryType !== undefined) {
      url.searchParams.set('libraryType', libraryType.toString());
    }

    const response = await fetchWithAuth(url.toString());
    return response.json();
  },
};
