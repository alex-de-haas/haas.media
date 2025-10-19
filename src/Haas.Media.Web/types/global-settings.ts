export interface GlobalSettings {
  id: number;
  preferredMetadataLanguage: string;
  countryCode: string;
  updatedAt: string;
}

export interface UpdateGlobalSettingsRequest {
  preferredMetadataLanguage: string;
  countryCode: string;
}
