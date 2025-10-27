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
}

export interface ConnectNodeRequest {
  name: string;
  url: string;
  /** API key/token from destination node (to authenticate TO destination) - must be entered manually */
  destinationApiKey?: string;
  /** ID of current node's external token (to send TO destination for callback) */
  currentNodeTokenId?: string;
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
