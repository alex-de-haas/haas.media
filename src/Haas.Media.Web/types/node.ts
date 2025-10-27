/**
 * Node-related type definitions
 */

export interface NodeInfo {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  createdAt: string;
  lastValidatedAt?: string;
  isEnabled: boolean;
  metadata: Record<string, string>;
}

export interface ConnectNodeRequest {
  name: string;
  url: string;
  apiKey?: string;
  tokenId?: string;
}

export interface UpdateNodeRequest {
  name?: string;
  url?: string;
  apiKey?: string;
  isEnabled?: boolean;
}

export interface NodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
  systemInfo?: Record<string, string>;
}

export interface ValidateNodeRequest {
  url: string;
  apiKey?: string;
}
