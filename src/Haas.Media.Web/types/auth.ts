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
