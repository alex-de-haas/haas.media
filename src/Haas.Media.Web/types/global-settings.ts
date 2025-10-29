export interface GlobalSettings {
  id: number;
  preferredMetadataLanguage: string;
  countryCode: string;
  movieDirectories: string[];
  tvShowDirectories: string[];
  topCastCount: number;
  topCrewCount: number;
  updatedAt: string;
}

export interface UpdateGlobalSettingsRequest {
  preferredMetadataLanguage: string;
  countryCode: string;
  movieDirectories: string[];
  tvShowDirectories: string[];
  topCastCount: number;
  topCrewCount: number;
}
