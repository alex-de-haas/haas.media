export interface GlobalSettings {
  id: number;
  preferredMetadataLanguage: string;
  countryCode: string;
  movieDirectories: string[];
  tvShowDirectories: string[];
  updatedAt: string;
}

export interface UpdateGlobalSettingsRequest {
  preferredMetadataLanguage: string;
  countryCode: string;
  movieDirectories: string[];
  tvShowDirectories: string[];
}
