export interface FileItem {
  name: string;
  extension: string | null;
  relativePath: string;
  size: number | null;
  lastModified: string;
  isDirectory: boolean;
}

export interface CopyRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface MoveRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface CreateDirectoryRequest {
  path: string;
}

export interface CopyOperationInfo {
  id: string;
  sourcePath: string;
  destinationPath: string;
  totalBytes: number;
  copiedBytes: number;
  progress: number;
  state: CopyOperationState;
  startTime: string;
  completedTime?: string;
  errorMessage?: string;
  isDirectory?: boolean;
  totalFiles?: number;
  copiedFiles?: number;
}

export enum CopyOperationState {
  Running = 0,
  Completed = 1,
  Failed = 2,
  Cancelled = 3,
}

// Legacy type aliases for backward compatibility
export interface CopyFileRequest extends CopyRequest {}
export interface MoveFileRequest extends MoveRequest {}
