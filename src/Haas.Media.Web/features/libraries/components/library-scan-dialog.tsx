"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface LibraryScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: LibraryScanOptions) => void;
}

export interface LibraryScanOptions {
  scanForNewFiles: boolean;
  updateFileMetadata: boolean;
  updateMovies: boolean;
  updateTvShows: boolean;
  updatePeople: boolean;
}

export function LibraryScanDialog({ open, onOpenChange, onConfirm }: LibraryScanDialogProps) {
  const [scanForNewFiles, setScanForNewFiles] = useState(true);
  const [updateFileMetadata, setUpdateFileMetadata] = useState(false);
  const [updateMovies, setUpdateMovies] = useState(false);
  const [updateTvShows, setUpdateTvShows] = useState(false);
  const [updatePeople, setUpdatePeople] = useState(false);

  const hasAtLeastOneSelection = scanForNewFiles || updateFileMetadata || updateMovies || updateTvShows || updatePeople;

  const handleConfirm = () => {
    if (!hasAtLeastOneSelection) {
      return;
    }

    onConfirm({
      scanForNewFiles,
      updateFileMetadata,
      updateMovies,
      updateTvShows,
      updatePeople,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Library Scan</AlertDialogTitle>
          <AlertDialogDescription>
            Choose what to scan and update. You can scan for new files and optionally update existing metadata from TMDb.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Scan for new content</h4>
            <div className="flex items-center space-x-2">
              <Checkbox id="scan-files" checked={scanForNewFiles} onCheckedChange={(checked) => setScanForNewFiles(checked === true)} />
              <Label
                htmlFor="scan-files"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Files metadata
              </Label>
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Update existing data</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-file-metadata"
                  checked={updateFileMetadata}
                  onCheckedChange={(checked) => setUpdateFileMetadata(checked === true)}
                />
                <Label
                  htmlFor="update-file-metadata"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Files metadata
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="update-movies" checked={updateMovies} onCheckedChange={(checked) => setUpdateMovies(checked === true)} />
                <Label
                  htmlFor="update-movies"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Movies
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="update-tvshows" checked={updateTvShows} onCheckedChange={(checked) => setUpdateTvShows(checked === true)} />
                <Label
                  htmlFor="update-tvshows"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  TV Shows
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="update-people" checked={updatePeople} onCheckedChange={(checked) => setUpdatePeople(checked === true)} />
                <Label
                  htmlFor="update-people"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  People
                </Label>
              </div>
            </div>
          </div>

          {!hasAtLeastOneSelection && <p className="text-sm text-destructive">Please select at least one option</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!hasAtLeastOneSelection}>
            Start Scan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
