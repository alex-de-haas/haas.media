"use client";

import { useMemo, useState } from "react";
import { useLibraries, LibraryForm, LibraryList } from "@/features/libraries";
import { MetadataSyncDialog, type MetadataSyncOptions } from "@/features/libraries/components/metadata-sync-dialog";
import { LibraryScanDialog, type LibraryScanOptions } from "@/features/libraries/components/library-scan-dialog";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { useNotifications } from "@/lib/notifications";
import { usePageTitle } from "@/components/layout";
import type { CreateLibraryRequest, Library, UpdateLibraryRequest } from "@/types/library";
import type { MetadataSyncOperationInfo } from "@/types";
import { BackgroundTaskStatus, backgroundTaskStatusLabel, isActiveBackgroundTask } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, RefreshCcw } from "lucide-react";

export default function LibrariesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryToDelete, setLibraryToDelete] = useState<Library | null>(null);
  const [isLibraryScanDialogOpen, setIsLibraryScanDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

  const { libraries, loading, createLibrary, updateLibrary, deleteLibrary, startLibraryScan, startMetadataSync } = useLibraries();

  const { notify } = useNotifications();
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks();

  const syncTasks = useMemo(() => backgroundTasks.filter((task) => task.type === "MetadataSyncTask"), [backgroundTasks]);

  const activeSyncTask = useMemo(() => syncTasks.find(isActiveBackgroundTask), [syncTasks]);

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedLibrary(null);
  };

  const handleFormSubmit = async (data: CreateLibraryRequest | UpdateLibraryRequest) => {
    if (selectedLibrary?.id) {
      const result = await updateLibrary(selectedLibrary.id, data);
      notify({
        title: result.success ? "Library Updated" : "Update Failed",
        message: result.message,
        type: result.success ? "success" : "error",
      });

      if (result.success) {
        closeForm();
      }
      return;
    }

    const result = await createLibrary(data);
    notify({
      title: result.success ? "Library Created" : "Create Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      closeForm();
    }
  };

  const handleDeleteLibrary = async () => {
    if (!libraryToDelete?.id) return;

    const result = await deleteLibrary(libraryToDelete.id);
    notify({
      title: result.success ? "Library Deleted" : "Delete Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      setLibraryToDelete(null);
    }
  };

  const handleLibraryScanConfirm = async (options: LibraryScanOptions) => {
    const result = await startLibraryScan(options);
    notify({
      title: result.success ? "Library Scan Started" : "Scan Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  const handleMetadataSync = () => {
    if (activeSyncTask && isActiveBackgroundTask(activeSyncTask)) {
      notify({
        title: "Sync In Progress",
        message: "Metadata sync is already running. Please wait for it to finish before starting a new one.",
        type: "success",
      });
      return;
    }

    setIsSyncDialogOpen(true);
  };

  const handleSyncConfirm = async (options: MetadataSyncOptions) => {
    const result = await startMetadataSync({
      libraryIds: options.libraryIds.length > 0 ? options.libraryIds : [],
      refreshMovies: options.refreshMovies,
      refreshTvShows: options.refreshTvShows,
      refreshPeople: options.refreshPeople,
    });
    notify({
      title: result.success ? "Sync Started" : "Sync Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  const activeSyncOperation = useMemo<MetadataSyncOperationInfo | null>(() => {
    if (!activeSyncTask || typeof activeSyncTask.payload !== "object" || activeSyncTask.payload === null) {
      return null;
    }

    const raw = activeSyncTask.payload as Record<string, unknown>;
    const toNumber = (value: unknown): number => {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const toOptionalString = (value: unknown): string | null => (typeof value === "string" ? value : null);

    return {
      id: typeof raw.id === "string" ? raw.id : activeSyncTask.id,
      startTime: toOptionalString(raw.startTime) ?? activeSyncTask.startedAt ?? activeSyncTask.createdAt ?? new Date().toISOString(),
      stage: toOptionalString(raw.stage) ?? activeSyncTask.name,
      currentItem: toOptionalString(raw.currentItem),
      totalNewFiles: toNumber(raw.totalNewFiles),
      processedNewFiles: toNumber(raw.processedNewFiles),
      totalMovies: toNumber(raw.totalMovies),
      processedMovies: toNumber(raw.processedMovies),
      totalTvShows: toNumber(raw.totalTvShows),
      processedTvShows: toNumber(raw.processedTvShows),
      totalPeople: toNumber(raw.totalPeople),
      processedPeople: toNumber(raw.processedPeople),
      syncedPeople: toNumber(raw.syncedPeople),
      failedPeople: toNumber(raw.failedPeople),
      lastError: toOptionalString(raw.lastError) ?? activeSyncTask.errorMessage ?? null,
      completedAt: toOptionalString(raw.completedAt),
    };
  }, [activeSyncTask]);

  const activeSync = activeSyncTask ? { task: activeSyncTask, operation: activeSyncOperation } : null;

  const isSyncRunning = activeSync?.task ? isActiveBackgroundTask(activeSync.task) : false;
  const syncProgressPercentage = activeSync?.task ? Math.round(activeSync.task.progress) : 0;
  const syncButtonLabel = isSyncRunning ? `Syncing… (${syncProgressPercentage}%)` : "Sync Metadata";
  const syncIcon = isSyncRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />;

  const syncStatusLabel = activeSync?.task
    ? backgroundTaskStatusLabel(activeSync.task.status)
    : backgroundTaskStatusLabel(BackgroundTaskStatus.Pending);

  const syncOperation = activeSync?.operation;
  const syncSummaryParts: string[] = [];

  if (syncOperation) {
    if (syncOperation.totalNewFiles > 0) {
      syncSummaryParts.push(`${syncOperation.processedNewFiles}/${syncOperation.totalNewFiles} new files`);
    }

    if (syncOperation.totalMovies > 0) {
      syncSummaryParts.push(`${syncOperation.processedMovies}/${syncOperation.totalMovies} movies`);
    }

    if (syncOperation.totalTvShows > 0) {
      syncSummaryParts.push(`${syncOperation.processedTvShows}/${syncOperation.totalTvShows} TV shows`);
    }

    const totalPeople = syncOperation.totalPeople ?? 0;
    if (totalPeople > 0) {
      const syncedPeople = syncOperation.syncedPeople ?? 0;
      const failedPeople = syncOperation.failedPeople ?? 0;
      const label =
        failedPeople > 0 ? `People ${syncedPeople}/${totalPeople} (${failedPeople} failed)` : `People ${syncedPeople}/${totalPeople}`;
      syncSummaryParts.push(label);
    }
  }

  const syncProgressSummary = syncSummaryParts.length > 0 ? syncSummaryParts.join(" • ") : syncStatusLabel;

  const syncStatusMessage =
    activeSync?.task.statusMessage ?? syncOperation?.currentItem ?? syncOperation?.stage ?? syncStatusLabel;

  const syncLastError = syncOperation?.lastError ?? activeSync?.task.errorMessage ?? null;

  usePageTitle("Libraries");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setSelectedLibrary(null);
            setIsFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Library
        </Button>
        <Button variant="outline" onClick={handleMetadataSync} disabled={loading || isSyncRunning}>
          {syncIcon}
          {syncButtonLabel}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary" className="h-6 px-3 text-xs">
          {libraries.length} {libraries.length === 1 ? "library" : "libraries"}
        </Badge>
      </div>

      {activeSync && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Metadata Sync in Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!activeSync.task) return;
                  try {
                    const result = await cancelTask(activeSync.task.id);
                    notify({
                      title: result.success ? "Cancellation Requested" : "Cancel Failed",
                      message: result.message ?? (result.success ? "Metadata sync cancellation requested." : "Unable to cancel metadata sync."),
                      type: result.success ? "success" : "error",
                    });
                  } catch (error: unknown) {
                    notify({
                      title: "Cancel Failed",
                      message: error instanceof Error ? error.message : "Unable to cancel metadata sync.",
                      type: "error",
                    });
                  }
                }}
                disabled={!isSyncRunning}
                className="shrink-0"
              >
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{syncProgressSummary}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{syncProgressPercentage}%</span>
                <span>{syncStatusLabel}</span>
              </div>
              <Progress value={Math.min(100, Math.max(0, syncProgressPercentage))} />
            </div>

            {syncStatusMessage && (
              <Alert>
                <AlertTitle>Processing</AlertTitle>
                <AlertDescription className="truncate">{syncStatusMessage}</AlertDescription>
              </Alert>
            )}

            {syncLastError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="truncate">{syncLastError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <LibraryList
          libraries={libraries}
          onEdit={(library) => {
            setSelectedLibrary(library);
            setIsFormOpen(true);
          }}
          onDelete={setLibraryToDelete}
          loading={loading}
        />
      </div>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setSelectedLibrary(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="text-left">
            <DialogTitle>{selectedLibrary ? "Edit Library" : "Create Library"}</DialogTitle>
            <DialogDescription>
              {selectedLibrary ? "Update the details of your existing library." : "Create a library to group related media files."}
            </DialogDescription>
          </DialogHeader>
          <LibraryForm
            {...(selectedLibrary && { library: selectedLibrary })}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(libraryToDelete)} onOpenChange={(open) => !open && setLibraryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete library?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{libraryToDelete?.title}</strong>. Any downloads in progress will continue to exist on disk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-xs text-muted-foreground">Location: {libraryToDelete?.directoryPath}</div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteLibrary}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LibraryScanDialog open={isLibraryScanDialogOpen} onOpenChange={setIsLibraryScanDialogOpen} onConfirm={handleLibraryScanConfirm} />

      <MetadataSyncDialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen} onConfirm={handleSyncConfirm} libraries={libraries} />
    </main>
  );
}
