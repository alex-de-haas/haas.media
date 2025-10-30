"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { GlobalSettings } from "@/types/global-settings";
import { LibraryType } from "@/types/library";

interface DownloadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (destinationDirectory: string, fileName: string) => void;
  defaultFileName: string;
  mediaType: LibraryType;
  globalSettings: GlobalSettings | null;
  isDownloading?: boolean;
}

export function DownloadFileDialog({
  open,
  onOpenChange,
  onConfirm,
  defaultFileName,
  mediaType,
  globalSettings,
  isDownloading = false,
}: DownloadFileDialogProps) {
  const [selectedDirectory, setSelectedDirectory] = useState<string>("");
  const [fileName, setFileName] = useState<string>(defaultFileName);

  // Get available directories based on media type
  const availableDirectories = useMemo(() => {
    if (!globalSettings) return [];
    return mediaType === LibraryType.Movies ? globalSettings.movieDirectories : globalSettings.tvShowDirectories;
  }, [globalSettings, mediaType]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setFileName(defaultFileName);
      // Auto-select first available directory
      if (availableDirectories.length > 0 && availableDirectories[0]) {
        setSelectedDirectory(availableDirectories[0]);
      } else {
        setSelectedDirectory("");
      }
    }
  }, [open, defaultFileName, availableDirectories]);

  const handleConfirm = () => {
    if (selectedDirectory && fileName.trim()) {
      onConfirm(selectedDirectory, fileName.trim());
    }
  };

  const isValid = selectedDirectory && fileName.trim();
  const hasNoDirectories = availableDirectories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Download File from Node</DialogTitle>
          <DialogDescription>Choose a destination directory and confirm the file name for download.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasNoDirectories ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No {mediaType === LibraryType.Movies ? "movie" : "TV show"} directories configured. Please configure{" "}
                {mediaType === LibraryType.Movies ? "movie" : "TV show"} directories in settings before downloading.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="directory">Destination Directory</Label>
                <Select value={selectedDirectory} onValueChange={setSelectedDirectory} disabled={isDownloading}>
                  <SelectTrigger id="directory">
                    <SelectValue placeholder="Select a directory" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDirectories.map((dir) => (
                      <SelectItem key={dir} value={dir}>
                        {dir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only {mediaType === LibraryType.Movies ? "movie" : "TV show"} directories are shown.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter file name"
                  disabled={isDownloading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && isValid && !isDownloading) {
                      handleConfirm();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">The file will be saved with this name in the selected directory.</p>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDownloading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || hasNoDirectories || isDownloading}>
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
