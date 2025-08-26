export interface FileItem {
  name: string;
  extension: string | null;
  relativePath: string;
  size: number | null;
  lastModified: string;
  isDirectory: boolean;
}

export interface CopyFileRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface MoveFileRequest {
  sourcePath: string;
  destinationPath: string;
  overwrite?: boolean;
}

export interface CreateDirectoryRequest {
  path: string;
}
