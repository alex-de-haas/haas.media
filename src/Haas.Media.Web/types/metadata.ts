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
  seasons: TVSeasonMetadata[];
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
