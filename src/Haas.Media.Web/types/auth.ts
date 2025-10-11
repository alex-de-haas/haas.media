export interface User {
  username: string;
  email: string;
  createdAt: string;
  lastLoginAt?: string;
  nickname?: string | null;
  preferredMetadataLanguage?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  nickname?: string | null;
  preferredMetadataLanguage?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  preferredMetadataLanguage?: string;
}

export interface UpdateProfileRequest {
  email: string;
  nickname?: string;
  preferredMetadataLanguage: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
