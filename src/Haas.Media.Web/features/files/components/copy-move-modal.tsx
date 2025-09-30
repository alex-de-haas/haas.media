"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FileItem, CopyFileRequest, MoveFileRequest } from "@/types/file";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import FileList from "./file-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface CopyMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move";
  item: FileItem;
  onConfirm: (data: CopyFileRequest | MoveFileRequest) => Promise<{ success: boolean; message: string }>;
}

type DestinationMode = "browser" | "manual";

export default function CopyMoveModal({
  isOpen,
  onClose,
  action,
  item,
  onConfirm,
}: CopyMoveModalProps) {
  const [destinationPath, setDestinationPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [mode, setMode] = useState<DestinationMode>("browser");

  const actionTitle = useMemo(() => (action === "copy" ? "Copy" : "Move"), [action]);
  const loadingLabel = useMemo(() => (action === "copy" ? "Copying..." : "Moving..."), [action]);

  const fetchFiles = async (path?: string) => {
    setFilesLoading(true);
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const url = new URL(`${downloaderApi}/api/files`);
      if (path) url.searchParams.set("path", path);

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data);
      setCurrentPath(path || "");
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles("");
      setSelectedDestination("");
      setDestinationPath("");
      setMode("browser");
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === "browser") {
      setSelectedDestination(currentPath);
    }
  }, [currentPath, mode]);

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      setDestinationPath("");
      setSelectedDestination("");
      setMode("browser");
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const basePath = mode === "manual" ? destinationPath.trim() : selectedDestination.trim();
    if (!basePath) return;

    setLoading(true);
    try {
      const finalDestinationPath = basePath ? `${basePath}/${item.name}` : item.name;
      const result = await onConfirm({
        sourcePath: item.relativePath,
        destinationPath: finalDestinationPath,
      });

      if (result?.success) {
        handleOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const summaryDestination = mode === "manual" ? destinationPath.trim() : selectedDestination.trim();
  const finalDestinationSummary = summaryDestination ? `${summaryDestination}/${item.name}` : item.name;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {actionTitle} {item.name}
          </DialogTitle>
          <DialogDescription>
            Current location: <span className="font-medium text-foreground">{item.relativePath}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Choose destination</p>
              <p className="text-xs text-muted-foreground">
                {summaryDestination
                  ? "The selected directory below will be used as the destination."
                  : "Browse files or enter a path manually to select the destination directory."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchFiles(currentPath)}
              disabled={filesLoading}
            >
              <RefreshCw className={filesLoading ? "mr-2 h-3.5 w-3.5 animate-spin" : "mr-2 h-3.5 w-3.5"} />
              Refresh
            </Button>
          </div>

          <Tabs value={mode} onValueChange={(value) => setMode(value as DestinationMode)}>
            <TabsList className="w-fit">
              <TabsTrigger value="browser">Browse</TabsTrigger>
              <TabsTrigger value="manual">Manual input</TabsTrigger>
            </TabsList>

            <TabsContent value="browser" className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                {selectedDestination ? (
                  <span>
                    Destination directory: <span className="font-medium text-foreground">{selectedDestination || "root"}</span>
                  </span>
                ) : (
                  "Navigate to the desired directory. The current view is selected automatically."
                )}
              </div>
              <FileList
                files={files}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                loading={filesLoading}
              />
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Input
                  value={destinationPath}
                  onChange={(event) => setDestinationPath(event.target.value)}
                  placeholder={`Enter destination directory path (${item.name} will be appended)`}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Provide the directory path where the item should be {action === "copy" ? "copied" : "moved"}.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <Badge variant="outline">Preview</Badge>
              <span className="font-mono text-xs text-foreground">{finalDestinationSummary}</span>
            </div>
            {action === "move" && (
              <p className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                Moving will remove the source after completion.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (mode === "browser" && !selectedDestination) ||
                (mode === "manual" && !destinationPath.trim())
              }
            >
              {loading ? loadingLabel : actionTitle}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
