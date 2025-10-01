"use client";

import { useMemo, useState } from "react";
import { useLibraries, LibraryForm, LibraryList } from "@/features/libraries";
import { useNotifications } from "@/lib/notifications";
import { useMetadataSignalR } from "@/lib/signalr/useMetadataSignalR";
import { PageHeader } from "@/components/layout";
import type { CreateLibraryRequest, Library, UpdateLibraryRequest } from "@/types/library";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2, Plus, Scan, ShieldAlert } from "lucide-react";

export default function LibrariesClient() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [libraryToDelete, setLibraryToDelete] = useState<Library | null>(null);

  const {
    libraries,
    loading,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    startBackgroundScan,
  } = useLibraries();

  const { notify } = useNotifications();
  const { scanOperations, isConnected } = useMetadataSignalR();

  const activeScanOperation = useMemo(
    () => scanOperations.find((operation) => operation.state === "Running"),
    [scanOperations]
  );

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
    if (activeScanOperation?.state === "Running") {
      notify({
        title: "Scan In Progress",
        message: "A library scan is already running. Please wait for it to finish before starting a new one.",
        type: "info",
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

  const scanButtonLabel = activeScanOperation?.state === "Running"
    ? `Scanning… (${Math.round(activeScanOperation.progress)}%)`
    : "Scan Libraries";

  const scanIcon = activeScanOperation?.state === "Running"
    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    : <Scan className="mr-2 h-4 w-4" />;

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        title="Libraries"
        description="Manage your media libraries and organise your content collections."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => { setSelectedLibrary(null); setIsFormOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Library
            </Button>
            <Button
              variant="outline"
              onClick={handleScanLibraries}
              disabled={loading || activeScanOperation?.state === "Running"}
            >
              {scanIcon}
              {scanButtonLabel}
            </Button>
          </div>
        }
      />

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

      {activeScanOperation && (
        <Card className={cn("border-primary/40 bg-primary/5", !isConnected && "border-dashed")}> 
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scan in Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {activeScanOperation.processedFiles} of {activeScanOperation.totalFiles} files processed •
              {" "}
              {activeScanOperation.foundMetadata} metadata records found
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(activeScanOperation.progress)}%</span>
              </div>
              <Progress value={Math.min(100, Math.max(0, activeScanOperation.progress))} />
            </div>

            {activeScanOperation.currentFile && (
              <Alert>
                <AlertTitle>Processing</AlertTitle>
                <AlertDescription className="truncate">
                  {activeScanOperation.currentFile}
                </AlertDescription>
              </Alert>
            )}

            {!isConnected && (
              <Alert variant="destructive">
                <AlertTitle>Connection lost</AlertTitle>
                <AlertDescription>
                  We will resume updates once the realtime connection is restored.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Your Libraries</h2>
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
              {selectedLibrary
                ? "Update the details of your existing library."
                : "Create a library to group related media files."}
            </DialogDescription>
          </DialogHeader>
          <LibraryForm
            library={selectedLibrary ?? undefined}
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
          <div className="text-xs text-muted-foreground">
            Location: {libraryToDelete?.directoryPath}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteLibrary}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
