import type { LibraryType } from "./library";

export interface AddToLibraryResponse {
  operationId: string;
  message: string;
}

export interface AddToLibraryOperationInfo {
  id: string;
  libraryId: string;
  libraryType: LibraryType;
  libraryTitle?: string | null;
  tmdbId: number;
  stage: string;
  startTime: string;
  title?: string | null;
  posterPath?: string | null;
  completedTime?: string | null;
  totalSeasons?: number | null;
  processedSeasons?: number | null;
  totalEpisodes?: number | null;
  processedEpisodes?: number | null;
}

export interface SearchResult {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string;
  voteAverage: number;
  voteCount: number;
  type: LibraryType;
  posterPath?: string;
  backdropPath?: string;
}

export interface CrewMember {
  tmdbId: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

export interface CastMember {
  tmdbId: number;
  name: string;
  character: string;
  order: number;
  profilePath?: string;
}

export interface Network {
  tmdbId: number;
  name: string;
  logoPath?: string;
  originCountry?: string;
}

export interface MovieMetadata {
  id: string;
  tmdbId: number;
  originalTitle: string;
  originalLanguage: string;
  title: string;
  overview: string;
  voteAverage: number;
  voteCount: number;
  releaseDate?: string;
  genres: string[];
  crew: CrewMember[];
  cast: CastMember[];
  posterPath?: string;
  backdropPath?: string;
  libraryId?: string | null;
  filePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TVShowMetadata {
  id: string;
  tmdbId: number;
  originalTitle: string;
  originalLanguage: string;
  title: string;
  overview: string;
  voteAverage: number;
  voteCount: number;
  genres: string[];
  crew: CrewMember[];
  cast: CastMember[];
  networks: Network[];
  seasons: TVSeasonMetadata[];
  posterPath?: string;
  backdropPath?: string;
  libraryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TVSeasonMetadata {
  seasonNumber: number;
  overview: string;
  voteAverage: number;
  episodes: TVEpisodeMetadata[];
  directoryPath: string;
}

export interface TVEpisodeMetadata {
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  voteAverage: number;
  filePath?: string | null;
}
