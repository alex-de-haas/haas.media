import type { LibraryType } from './library';

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

export interface MovieMetadata {
  id?: string;
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
  libraryId: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface TVShowMetadata {
  id?: string;
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
  seasons: TVSeasonMetadata[];
  posterPath?: string;
  backdropPath?: string;
  libraryId: string;
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
  filePath: string;
}
