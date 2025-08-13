"use client";

import { useState } from "react";

interface UseFileUploadReturn {
  file: File | null;
  dragActive: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>, onInvalidFile?: (message: string) => void) => void;
  setFile: (file: File | null) => void;
  clearFile: () => void;
}

export function useFileUpload(acceptedExtensions?: string[]): UseFileUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (acceptedExtensions && acceptedExtensions.length > 0) {
        const hasValidExtension = acceptedExtensions.some(ext => 
          droppedFile.name.toLowerCase().endsWith(ext.toLowerCase())
        );
        
        if (!hasValidExtension) {
          onInvalidFile?.(
            `Only ${acceptedExtensions.join(', ')} files are allowed.`
          );
          return;
        }
      }
      
      setFile(droppedFile);
    }
  };

  const clearFile = () => setFile(null);

  return {
    file,
    dragActive,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    setFile,
    clearFile,
  };
}
