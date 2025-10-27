export interface User {
  username: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// External Tokens
export interface ExternalTokenInfo {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface ExternalTokenResponse {
  id: string;
  name: string;
  token: string;
  createdAt: string;
}

export interface CreateExternalTokenRequest {
  name: string;
}
