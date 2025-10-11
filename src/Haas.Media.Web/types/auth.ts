export interface User {
  username: string;
  email: string;
  createdAt: string;
  lastLoginAt?: string;
  nickname?: string | null;
}

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
  nickname?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  email: string;
  nickname?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
