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
  lastError?: string | null;
  totalPeople?: number;
  syncedPeople?: number;
  failedPeople?: number;
}

export interface LibraryScanRequest {
  scanForNewFiles?: boolean;
  updateFileMetadata?: boolean;
  updateMovies?: boolean;
  updateTvShows?: boolean;
  updatePeople?: boolean;
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
  logoPath?: string;
  releaseDate?: Date | null;
  originalLanguage: string;
}

export interface FileMetadata {
  id?: string;
  libraryId: string;
  mediaId: string;
  libraryType: LibraryType;
  filePath: string;
  md5Hash?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  createdAt: string;
  updatedAt: string;
  nodeId?: string | null;
  nodeName?: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath?: string;
  weight: number;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  profilePath?: string;
}

export enum PersonGender {
  Unknown = 0,
  Female = 1,
  Male = 2,
  NonBinary = 3,
}

export interface PersonMetadata {
  id: number;
  biography?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  gender: PersonGender;
  name?: string | null;
  placeOfBirth?: string | null;
  popularity: number;
  profilePath?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonLibraryCredits {
  movies: MovieMetadata[];
  tvShows: TVShowMetadata[];
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  skip: number;
  take: number;
  hasMore: boolean;
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
  logoPath?: string;
  filePath?: string | null;
  officialRating?: string | null;
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
  logoPath?: string;
  officialRating?: string | null;
  firstAirDate?: string | null;
  status?: string | null;
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
  voteCount: number;
  airDate?: string | null;
  runtime?: number | null;
  stillPath?: string | null;
  cast: CastMember[];
  crew: CrewMember[];
  filePath?: string | null;
}

export interface MetadataSyncOperationInfo {
  id: string;
  startTime: string;
  stage: string;
  currentItem?: string | null;
  totalNewFiles: number;
  processedNewFiles: number;
  deletedOrphanedFiles: number;
  totalMovies: number;
  processedMovies: number;
  totalTvShows: number;
  processedTvShows: number;
  totalPeople: number;
  processedPeople: number;
  syncedPeople: number;
  failedPeople: number;
  lastError?: string | null;
  completedAt?: string | null;
}

export interface PersonCleanupOperationInfo {
  id: string;
  totalPeople: number;
  checkedPeople: number;
  deletedPeople: number;
  stage: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastError?: string | null;
}

export interface FilePlaybackInfo {
  id: string;
  userId: string;
  fileMetadataId: string;
  playbackPositionTicks: number;
  playCount: number;
  played: boolean;
  lastPlayedDate?: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoviePlaybackInfo {
  movieId: number;
  files: FilePlaybackInfo[];
  totalPlayCount: number;
  anyPlayed: boolean;
  isFavorite: boolean;
}

export interface TVShowPlaybackInfo {
  tvShowId: number;
  totalEpisodes: number;
  watchedEpisodes: number;
  totalPlayCount: number;
  isFavorite: boolean;
}

export interface SavePlaybackInfoRequest {
  fileMetadataId: string;
  playbackPositionTicks?: number;
  playCount?: number;
  played?: boolean;
  isFavorite?: boolean;
}
