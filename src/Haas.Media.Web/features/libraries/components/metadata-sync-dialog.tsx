"use client";

import { useState } from "react";
import type { Library } from "@/types/library";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface MetadataSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: MetadataSyncOptions) => void;
  libraries: Library[];
}

export interface MetadataSyncOptions {
  libraryIds: string[];
  refreshMovies: boolean;
  refreshTvShows: boolean;
  refreshPeople: boolean;
}

export function MetadataSyncDialog({ open, onOpenChange, onConfirm, libraries }: MetadataSyncDialogProps) {
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [refreshMovies, setRefreshMovies] = useState(true);
  const [refreshTvShows, setRefreshTvShows] = useState(true);
  const [refreshPeople, setRefreshPeople] = useState(true);

  const handleLibraryToggle = (libraryId: string) => {
    setSelectedLibraryIds((prev) => (prev.includes(libraryId) ? prev.filter((id) => id !== libraryId) : [...prev, libraryId]));
  };

  const handleSelectAll = () => {
    if (selectedLibraryIds.length === libraries.length) {
      setSelectedLibraryIds([]);
    } else {
      setSelectedLibraryIds(libraries.map((lib) => lib.id).filter((id): id is string => id !== undefined));
    }
  };

  const hasAtLeastOneRefreshOption = refreshMovies || refreshTvShows || refreshPeople;

  const handleConfirm = () => {
    if (!hasAtLeastOneRefreshOption) {
      return;
    }

    onConfirm({
      libraryIds: selectedLibraryIds,
      refreshMovies,
      refreshTvShows,
      refreshPeople,
    });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sync Metadata</AlertDialogTitle>
          <AlertDialogDescription>
            Select libraries to sync and choose what metadata to refresh. This will scan for new files and optionally update existing metadata from
            TMDb.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Library Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Libraries</h4>
              <button type="button" onClick={handleSelectAll} className="text-xs text-muted-foreground hover:text-foreground">
                {selectedLibraryIds.length === libraries.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Leave empty to sync all libraries</p>
            <ScrollArea className="h-[120px] rounded-md border p-3">
              <div className="space-y-2">
                {libraries.map((library) => {
                  if (!library.id) return null;
                  return (
                    <div key={library.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`library-${library.id}`}
                        checked={selectedLibraryIds.includes(library.id)}
                        onCheckedChange={() => handleLibraryToggle(library.id!)}
                      />
                      <Label
                        htmlFor={`library-${library.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {library.title}
                        <span className="ml-2 text-xs text-muted-foreground">({library.type})</span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Refresh Options */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Refresh Options</h4>
            <p className="text-xs text-muted-foreground">Choose what to refresh from TMDb (applies to both new and existing items)</p>

            <div className="space-y-2">
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
                  People (Cast & Crew)
                </Label>
              </div>
            </div>

            {!hasAtLeastOneRefreshOption && <p className="text-sm text-destructive">Please select at least one refresh option</p>}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={!hasAtLeastOneRefreshOption}>
            Start Sync
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
