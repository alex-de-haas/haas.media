export enum FileItemType {
  Directory = 1,
  Media = 2,
  Other = 3,
}

export interface FileItem {
  name: string;
  extension: string | null;
  relativePath: string;
  size: number | null;
  lastModified: string;
  type: FileItemType;
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

export interface RenameRequest {
  path: string;
  newName: string;
}

export interface CopyOperationInfo {
  id: string;
  sourcePath: string;
  destinationPath: string;
  totalBytes: number;
  copiedBytes: number;
  startTime: string;
  completedTime?: string;
  isDirectory?: boolean;
  totalFiles?: number;
  copiedFiles?: number;
  currentPath?: string;
}

// Legacy type aliases for backward compatibility
export interface CopyFileRequest extends CopyRequest {}
export interface MoveFileRequest extends MoveRequest {}
