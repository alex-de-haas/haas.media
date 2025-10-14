export interface User {
  username: string;
  createdAt: string;
  lastLoginAt?: string;
  preferredMetadataLanguage: string;
  countryCode: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  preferredMetadataLanguage: string;
  countryCode: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  preferredMetadataLanguage?: string;
  countryCode?: string;
}

export interface UpdateProfileRequest {
  preferredMetadataLanguage: string;
  countryCode: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
