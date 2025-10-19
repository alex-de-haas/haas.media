export enum LibraryType {
  Movies = 1,
  TVShows = 2,
}

export interface Library {
  id?: string;
  type: LibraryType;
  directoryPath: string;
  title: string;
  description?: string;
  preferredMetadataLanguage: string;
  countryCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryRequest {
  type: LibraryType;
  directoryPath: string;
  title: string;
  description?: string;
  preferredMetadataLanguage: string;
  countryCode: string;
}

export interface UpdateLibraryRequest {
  type: LibraryType;
  directoryPath: string;
  title: string;
  description?: string;
  preferredMetadataLanguage: string;
  countryCode: string;
}
