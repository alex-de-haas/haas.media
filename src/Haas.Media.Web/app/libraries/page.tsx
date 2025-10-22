"use client";

import { useMemo, useState } from "react";
import { useLibraries, LibraryForm, LibraryList } from "@/features/libraries";
import { RefreshMetadataDialog, type RefreshOptions } from "@/features/libraries/components/refresh-metadata-dialog";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { useNotifications } from "@/lib/notifications";
import { useMetadataSignalR } from "@/lib/signalr/useMetadataSignalR";
import { usePageTitle } from "@/components/layout";
import type { CreateLibraryRequest, Library, UpdateLibraryRequest } from "@/types/library";
import type { MetadataRefreshOperationInfo } from "@/types";
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
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCcw, Scan, ShieldAlert } from "lucide-react";

export default function LibrariesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryToDelete, setLibraryToDelete] = useState<Library | null>(null);
  const [isCancellingScan, setIsCancellingScan] = useState(false);
  const [isCancellingRefresh, setIsCancellingRefresh] = useState(false);
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false);

  const { libraries, loading, createLibrary, updateLibrary, deleteLibrary, startBackgroundScan, startMetadataRefresh } = useLibraries();

  const { notify } = useNotifications();
  const { scanOperations, isConnected } = useMetadataSignalR();
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks();

  const scanTasks = useMemo(() => backgroundTasks.filter((task) => task.type === "MetadataScanTask"), [backgroundTasks]);
  const refreshTasks = useMemo(() => backgroundTasks.filter((task) => task.type === "MetadataRefreshTask"), [backgroundTasks]);

  const activeScanTask = useMemo(() => scanTasks.find(isActiveBackgroundTask), [scanTasks]);
  const activeRefreshTask = useMemo(() => refreshTasks.find(isActiveBackgroundTask), [refreshTasks]);

  const activeOperation = useMemo(
    () => (activeScanTask ? scanOperations.find((operation) => operation.id === activeScanTask.id) : undefined),
    [scanOperations, activeScanTask],
  );

  const activeScan = activeScanTask ? { task: activeScanTask, operation: activeOperation } : null;

  const activeRefreshOperation = useMemo<MetadataRefreshOperationInfo | null>(() => {
    if (!activeRefreshTask || typeof activeRefreshTask.payload !== "object" || activeRefreshTask.payload === null) {
      return null;
    }

    const raw = activeRefreshTask.payload as Record<string, unknown>;
    const toNumber = (value: unknown): number => {
      const numeric = typeof value === "number" ? value : Number(value ?? 0);
      return Number.isFinite(numeric) ? numeric : 0;
    };
    const toOptionalString = (value: unknown): string | null => (typeof value === "string" ? value : null);

    const startedAt = toOptionalString(raw.startedAt) ?? activeRefreshTask.startedAt ?? activeRefreshTask.createdAt ?? null;

    return {
      id: typeof raw.id === "string" ? raw.id : activeRefreshTask.id,
      totalItems: toNumber(raw.totalItems),
      processedItems: toNumber(raw.processedItems),
      totalMovies: toNumber(raw.totalMovies),
      processedMovies: toNumber(raw.processedMovies),
      totalTvShows: toNumber(raw.totalTvShows),
      processedTvShows: toNumber(raw.processedTvShows),
      stage: toOptionalString(raw.stage) ?? activeRefreshTask.name,
      currentTitle: toOptionalString(raw.currentTitle),
      startedAt,
      completedAt: toOptionalString(raw.completedAt),
      lastError: toOptionalString(raw.lastError) ?? activeRefreshTask.errorMessage ?? null,
      totalPeople: toNumber(raw.totalPeople),
      syncedPeople: toNumber(raw.syncedPeople),
      failedPeople: toNumber(raw.failedPeople),
    };
  }, [activeRefreshTask]);

  const activeRefresh = activeRefreshTask ? { task: activeRefreshTask, operation: activeRefreshOperation } : null;

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

  const handleScanLibraries = async () => {
    if (activeScan?.task && isActiveBackgroundTask(activeScan.task)) {
      notify({
        title: "Scan In Progress",
        message: "A library scan is already running. Please wait for it to finish before starting a new one.",
        type: "success",
      });
      return;
    }

    const result = await startBackgroundScan();
    notify({
      title: result.success ? "Scan Started" : "Scan Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  const handleRefreshMetadata = () => {
    if (activeRefresh?.task && isActiveBackgroundTask(activeRefresh.task)) {
      notify({
        title: "Refresh In Progress",
        message: "Metadata refresh is already running. Please wait for it to finish before starting a new one.",
        type: "success",
      });
      return;
    }

    setIsRefreshDialogOpen(true);
  };

  const handleRefreshConfirm = async (options: RefreshOptions) => {
    const result = await startMetadataRefresh(options);
    notify({
      title: result.success ? "Refresh Started" : "Refresh Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  const handleCancelScan = async () => {
    if (!activeScan?.task) {
      return;
    }

    setIsCancellingScan(true);
    try {
      const result = await cancelTask(activeScan.task.id);
      notify({
        title: result.success ? "Cancellation Requested" : "Cancel Failed",
        message: result.message ?? (result.success ? "Library scan cancellation requested." : "Unable to cancel library scan."),
        type: result.success ? "success" : "error",
      });
    } catch (error: unknown) {
      notify({
        title: "Cancel Failed",
        message: error instanceof Error ? error.message : "Unable to cancel library scan.",
        type: "error",
      });
    } finally {
      setIsCancellingScan(false);
    }
  };

  const handleCancelRefresh = async () => {
    if (!activeRefresh?.task) {
      return;
    }

    setIsCancellingRefresh(true);
    try {
      const result = await cancelTask(activeRefresh.task.id);
      notify({
        title: result.success ? "Cancellation Requested" : "Cancel Failed",
        message: result.message ?? (result.success ? "Metadata refresh cancellation requested." : "Unable to cancel metadata refresh."),
        type: result.success ? "success" : "error",
      });
    } catch (error: unknown) {
      notify({
        title: "Cancel Failed",
        message: error instanceof Error ? error.message : "Unable to cancel metadata refresh.",
        type: "error",
      });
    } finally {
      setIsCancellingRefresh(false);
    }
  };

  const fallbackProgress =
    activeOperation && activeOperation.totalFiles > 0
      ? Math.round((activeOperation.processedFiles / Math.max(1, activeOperation.totalFiles)) * 100)
      : 0;

  const progressPercentage = activeScan?.task ? Math.round(activeScan.task.progress) : fallbackProgress;

  const isScanRunning = activeScan?.task ? isActiveBackgroundTask(activeScan.task) : false;

  const scanButtonLabel = isScanRunning ? `Scanning… (${progressPercentage}%)` : "Scan Libraries";

  const scanIcon = isScanRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scan className="mr-2 h-4 w-4" />;

  const statusLabel = activeScan?.task
    ? backgroundTaskStatusLabel(activeScan.task.status)
    : backgroundTaskStatusLabel(BackgroundTaskStatus.Pending);

  const statusMessage = activeScan?.task?.statusMessage ?? activeOperation?.currentFile ?? statusLabel;

  const fileProgressSummary = (() => {
    if (!activeOperation) {
      return statusMessage;
    }

    const summaryParts = [
      `${activeOperation.processedFiles} of ${activeOperation.totalFiles} files processed`,
      `${activeOperation.foundMetadata} metadata records found`,
    ];

    const totalPeople = activeOperation.totalPeople ?? 0;
    if (totalPeople > 0) {
      const syncedPeople = activeOperation.syncedPeople ?? 0;
      const failedPeople = activeOperation.failedPeople ?? 0;
      const peopleLabel =
        failedPeople > 0 ? `People ${syncedPeople}/${totalPeople} (${failedPeople} failed)` : `People ${syncedPeople}/${totalPeople}`;
      summaryParts.push(peopleLabel);
    }

    return summaryParts.join(" • ");
  })();

  const refreshProgressPercentage = activeRefresh?.task ? Math.round(activeRefresh.task.progress) : 0;

  const isRefreshRunning = activeRefresh?.task ? isActiveBackgroundTask(activeRefresh.task) : false;

  const refreshButtonLabel = isRefreshRunning ? `Refreshing… (${refreshProgressPercentage}%)` : "Refresh";

  const refreshIcon = isRefreshRunning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />;

  const refreshStatusLabel = activeRefresh?.task
    ? backgroundTaskStatusLabel(activeRefresh.task.status)
    : backgroundTaskStatusLabel(BackgroundTaskStatus.Pending);

  const refreshOperation = activeRefresh?.operation;
  const refreshSummaryParts: string[] = [];

  if (refreshOperation) {
    if (refreshOperation.totalItems > 0) {
      refreshSummaryParts.push(`${refreshOperation.processedItems} of ${refreshOperation.totalItems} items processed`);
    }

    if (refreshOperation.totalMovies > 0) {
      refreshSummaryParts.push(`${refreshOperation.processedMovies}/${refreshOperation.totalMovies} movies`);
    }

    if (refreshOperation.totalTvShows > 0) {
      refreshSummaryParts.push(`${refreshOperation.processedTvShows}/${refreshOperation.totalTvShows} TV shows`);
    }

    const totalPeople = refreshOperation.totalPeople ?? 0;
    if (totalPeople > 0) {
      const syncedPeople = refreshOperation.syncedPeople ?? 0;
      const failedPeople = refreshOperation.failedPeople ?? 0;
      const label =
        failedPeople > 0 ? `People ${syncedPeople}/${totalPeople} (${failedPeople} failed)` : `People ${syncedPeople}/${totalPeople}`;
      refreshSummaryParts.push(label);
    }
  }

  const refreshProgressSummary = refreshSummaryParts.length > 0 ? refreshSummaryParts.join(" • ") : refreshStatusLabel;

  const refreshStatusMessage =
    activeRefresh?.task.statusMessage ?? refreshOperation?.currentTitle ?? refreshOperation?.stage ?? refreshStatusLabel;

  const refreshLastError = refreshOperation?.lastError ?? activeRefresh?.task.errorMessage ?? null;

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
        <Button variant="outline" onClick={handleScanLibraries} disabled={loading || isScanRunning}>
          {scanIcon}
          {scanButtonLabel}
        </Button>
        <Button variant="outline" onClick={handleRefreshMetadata} disabled={loading || isRefreshRunning}>
          {refreshIcon}
          {refreshButtonLabel}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary" className="h-6 px-3 text-xs">
          {libraries.length} {libraries.length === 1 ? "library" : "libraries"}
        </Badge>
        {!isConnected && (
          <div className="inline-flex items-center gap-1">
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
            <span>Realtime updates temporarily unavailable</span>
          </div>
        )}
      </div>

      {activeScan && (
        <Card className={cn("border-primary/40 bg-primary/5", !isConnected && "border-dashed")}>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scan in Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelScan}
                disabled={!isScanRunning || isCancellingScan}
                className="shrink-0"
              >
                {isCancellingScan && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{fileProgressSummary}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progressPercentage}%</span>
                <span>{statusLabel}</span>
              </div>
              <Progress value={Math.min(100, Math.max(0, progressPercentage))} />
            </div>

            {statusMessage && (
              <Alert>
                <AlertTitle>Processing</AlertTitle>
                <AlertDescription className="truncate">{statusMessage}</AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <Alert variant="destructive">
                <AlertTitle>Connection lost</AlertTitle>
                <AlertDescription>We will resume updates once the realtime connection is restored.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {activeRefresh && (
        <Card className={cn("border-primary/40 bg-primary/5", !isConnected && "border-dashed")}>
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Refresh in Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelRefresh}
                disabled={!isRefreshRunning || isCancellingRefresh}
                className="shrink-0"
              >
                {isCancellingRefresh && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Cancel
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{refreshProgressSummary}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{refreshProgressPercentage}%</span>
                <span>{refreshStatusLabel}</span>
              </div>
              <Progress value={Math.min(100, Math.max(0, refreshProgressPercentage))} />
            </div>

            {refreshStatusMessage && (
              <Alert>
                <AlertTitle>Processing</AlertTitle>
                <AlertDescription className="truncate">{refreshStatusMessage}</AlertDescription>
              </Alert>
            )}

            {refreshLastError && (
              <Alert variant="destructive">
                <AlertTitle>Last Error</AlertTitle>
                <AlertDescription className="truncate">{refreshLastError}</AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <Alert variant="destructive">
                <AlertTitle>Connection lost</AlertTitle>
                <AlertDescription>We will resume updates once the realtime connection is restored.</AlertDescription>
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

      <RefreshMetadataDialog open={isRefreshDialogOpen} onOpenChange={setIsRefreshDialogOpen} onConfirm={handleRefreshConfirm} />
    </main>
  );
}
