"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { HardDrive, Server } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui";
import { useFileMetadata } from "@/features/media/hooks/useFileMetadata";
import { useMapFileToMovie } from "@/features/media/hooks/useMapFileToMovie";
import { LibraryType } from "@/types/library";

interface AddFileToMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movieId: number;
  movieTitle: string;
  existingFileIds: Set<string>;
  onSuccess?: () => void;
}

export default function AddFileToMovieDialog({
  open,
  onOpenChange,
  movieId,
  movieTitle,
  existingFileIds,
  onSuccess,
}: AddFileToMovieDialogProps) {
  const t = useTranslations("movies");
  const tCommon = useTranslations("common");
  const { files: allFiles, loading: filesLoading } = useFileMetadata();
  const { mapFilesToMovie, loading: mappingLoading } = useMapFileToMovie();
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Filter to show only local files (nodeId = null) from current node, excluding files already assigned to this movie
  const availableFiles = useMemo(() => {
    console.log("🔍 Filter Debug:", {
      totalFiles: allFiles.length,
      existingFileIds: Array.from(existingFileIds),
      sampleFile: allFiles[0],
    });

    const filtered = allFiles.filter(
      (file) =>
        file.id &&
        !existingFileIds.has(file.id) &&
        // Only show files from the current node (nodeId = null or undefined)
        !file.nodeId &&
        // Only show movie-type files
        file.libraryType === LibraryType.Movies
    );

    console.log("✅ Filtered files:", filtered.length, filtered);
    return filtered;
  }, [allFiles, existingFileIds]);

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedFileIds(new Set());
    }
  }, [open]);

  const handleToggleFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFileIds.size === availableFiles.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(availableFiles.map((f) => f.id!)));
    }
  };

  const handleSubmit = async () => {
    if (selectedFileIds.size === 0) return;

    const success = await mapFilesToMovie(movieId, Array.from(selectedFileIds));
    if (success) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const isLoading = filesLoading || mappingLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("addFilesToMovie")}</DialogTitle>
          <DialogDescription>
            {t("addFilesToMovieDescription", { title: movieTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {filesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
            </div>
          ) : availableFiles.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">{t("noAvailableFilesToAdd")}</p>
          ) : (
            <>
              <div className="flex items-center justify-between px-2">
                <span className="text-sm text-muted-foreground">
                  {t("filesAvailable", { count: availableFiles.length })}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedFileIds.size === availableFiles.length ? tCommon("deselectAll") : tCommon("selectAll")}
                </Button>
              </div>

              <div className="space-y-2">
                {availableFiles.map((file) => {
                  const isRemote = Boolean(file.nodeId);
                  const isSelected = file.id ? selectedFileIds.has(file.id) : false;

                  return (
                    <div
                      key={file.id}
                      className="flex items-start gap-3 rounded-md border bg-muted/30 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox checked={isSelected} onCheckedChange={() => file.id && handleToggleFile(file.id)} className="mt-1" />

                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isRemote && file.nodeName && (
                            <Badge variant="outline" className="text-xs">
                              <Server className="mr-1 h-3 w-3" />
                              {file.nodeName}
                            </Badge>
                          )}
                          {!isRemote && (
                            <Badge variant="outline" className="text-xs">
                              <HardDrive className="mr-1 h-3 w-3" />
                              {t("local")}
                            </Badge>
                          )}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground break-all">{file.filePath}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || selectedFileIds.size === 0}>
            {mappingLoading && <Spinner className="mr-2 h-4 w-4" />}
            {t("addFiles", { count: selectedFileIds.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
