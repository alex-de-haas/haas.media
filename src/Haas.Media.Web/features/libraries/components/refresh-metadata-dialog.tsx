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

interface RefreshMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: RefreshOptions) => void;
}

export interface RefreshOptions {
  refreshMovies: boolean;
  refreshTvShows: boolean;
  refreshPeople: boolean;
}

export function RefreshMetadataDialog({ open, onOpenChange, onConfirm }: RefreshMetadataDialogProps) {
  const [refreshMovies, setRefreshMovies] = useState(true);
  const [refreshTvShows, setRefreshTvShows] = useState(true);
  const [refreshPeople, setRefreshPeople] = useState(true);

  const hasAtLeastOneSelection = refreshMovies || refreshTvShows || refreshPeople;

  const handleConfirm = () => {
    if (!hasAtLeastOneSelection) {
      return;
    }

    onConfirm({
      refreshMovies,
      refreshTvShows,
      refreshPeople,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Refresh Metadata</AlertDialogTitle>
          <AlertDialogDescription>
            Select which metadata to refresh from TMDb. This will update existing metadata with the latest information.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="refresh-movies" checked={refreshMovies} onCheckedChange={(checked) => setRefreshMovies(checked === true)} />
            <Label
              htmlFor="refresh-movies"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Movies
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="refresh-tvshows" checked={refreshTvShows} onCheckedChange={(checked) => setRefreshTvShows(checked === true)} />
            <Label
              htmlFor="refresh-tvshows"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              TV Shows
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="refresh-people" checked={refreshPeople} onCheckedChange={(checked) => setRefreshPeople(checked === true)} />
            <Label
              htmlFor="refresh-people"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              People
            </Label>
          </div>

          {!hasAtLeastOneSelection && <p className="text-sm text-destructive">Please select at least one option</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!hasAtLeastOneSelection}>
            Start Refresh
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
