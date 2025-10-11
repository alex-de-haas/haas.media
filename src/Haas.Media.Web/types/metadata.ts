import type { LibraryType } from "./library";

export interface AddToLibraryResponse {
  operationId: string;
  message: string;
}

export interface AddToLibraryOperationInfo {
  id: number;
  libraryId: string;
  libraryType: LibraryType;
  libraryTitle?: string | null;
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
  id: number;
  title: string;
  originalTitle: string;
  overview: string;
  voteAverage: number;
  voteCount: number;
  type: LibraryType;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: Date | null;
  originalLanguage: string;
}

export interface FileMetadata {
  id?: string;
  libraryId: string;
  mediaId: string;
  mediaType: LibraryType;
  filePath: string;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profilePath?: string;
}

export interface Network {
  id: number;
  name: string;
  logoPath?: string;
  originCountry?: string;
}

export enum ReleaseDateType {
  Theatrical = 0,
  TheatricalLimited = 1,
  Digital = 2,
  Physical = 3,
  Tv = 4,
  Premiere = 5,
}

export interface ReleaseDate {
  type: ReleaseDateType;
  date: string;
  countryCode?: string | null;
}

export interface MovieMetadata {
  id: number;
  originalTitle: string;
  originalLanguage: string;
  title: string;
  overview: string;
  voteAverage: number;
  voteCount: number;
  releaseDate?: string;
  releaseDates: ReleaseDate[];
  budget?: number | null;
  revenue?: number | null;
  genres: string[];
  crew: CrewMember[];
  cast: CastMember[];
  posterPath?: string;
  backdropPath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TVShowMetadata {
  id: number;
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
}

export interface MetadataRefreshOperationInfo {
  id: string;
  totalItems: number;
  processedItems: number;
  totalMovies: number;
  processedMovies: number;
  totalTvShows: number;
  processedTvShows: number;
  stage: string;
  currentTitle?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastError?: string | null;
  totalPeople?: number;
  syncedPeople?: number;
  failedPeople?: number;
}
