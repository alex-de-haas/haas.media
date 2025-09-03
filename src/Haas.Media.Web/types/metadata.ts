export interface MovieMetadata {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  plot?: string;
  poster?: string;
  imdbId?: string;
  tmdbId?: number;
  runtime?: number;
  genres?: string[];
  director?: string;
  cast?: string[];
  rating?: number;
  filePath: string;
  libraryId: string;
  fileSize?: number;
  dateAdded: string;
  lastModified: string;
}

export interface TVShowMetadata {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  plot?: string;
  poster?: string;
  imdbId?: string;
  tmdbId?: number;
  genres?: string[];
  network?: string;
  status?: string;
  rating?: number;
  libraryId: string;
  seasons?: TVSeasonMetadata[];
  dateAdded: string;
  lastModified: string;
}

export interface TVSeasonMetadata {
  id: string;
  seasonNumber: number;
  title?: string;
  year?: number;
  poster?: string;
  episodes?: TVEpisodeMetadata[];
}

export interface TVEpisodeMetadata {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  title?: string;
  plot?: string;
  airDate?: string;
  runtime?: number;
  filePath: string;
  fileSize?: number;
  lastModified: string;
}
