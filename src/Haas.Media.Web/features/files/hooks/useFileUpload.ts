"use client";

import { useState } from "react";

interface UseFileUploadReturn {
  files: File[];
  dragActive: boolean;
  handleFileChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    onInvalidFile?: (message: string) => void
  ) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>, onInvalidFile?: (message: string) => void) => void;
  setFiles: (files: File[]) => void;
  clearFiles: () => void;
  removeFile: (index: number) => void;
}

export function useFileUpload(acceptedExtensions?: string[]): UseFileUploadReturn {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const validateFiles = (
    selectedFiles: File[],
    onInvalidFile?: (message: string) => void
  ) => {
    if (!acceptedExtensions || acceptedExtensions.length === 0) {
      return selectedFiles;
    }

    const validFiles: File[] = [];
    const invalid: string[] = [];

    for (const file of selectedFiles) {
      const isValid = acceptedExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext.toLowerCase())
      );

      if (isValid) {
        validFiles.push(file);
      } else {
        invalid.push(file.name);
      }
    }

    if (invalid.length > 0) {
      const allowed = acceptedExtensions.join(", ");
      const names = invalid.join(", ");
      onInvalidFile?.(`Unsupported files (${names}). Allowed: ${allowed}.`);
    }

    return validFiles;
  };

  const mergeFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;

    setFiles((prev) => {
      const deduped = incoming.filter(
        (candidate) =>
          !prev.some(
            (existing) =>
              existing.name === candidate.name &&
              existing.size === candidate.size &&
              existing.lastModified === candidate.lastModified
          )
      );

      return deduped.length > 0 ? [...prev, ...deduped] : prev;
    });
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onInvalidFile?: (message: string) => void
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      const valid = validateFiles(selected, onInvalidFile);
      mergeFiles(valid);
    }

    // Allow re-selecting the same files
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, onInvalidFile?: (message: string) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const valid = validateFiles(droppedFiles, onInvalidFile);
      mergeFiles(valid);
    }
  };

  const clearFiles = () => setFiles([]);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    files,
    dragActive,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setFiles,
    clearFiles,
    removeFile,
  };
}
