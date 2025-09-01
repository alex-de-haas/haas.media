export interface Library {
  id?: string;
  directoryPath: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLibraryRequest {
  directoryPath: string;
  title: string;
  description?: string;
}

export interface UpdateLibraryRequest {
  directoryPath: string;
  title: string;
  description?: string;
}
