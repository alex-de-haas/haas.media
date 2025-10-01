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
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface CopyMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move";
  item: FileItem;
  onConfirm: (data: CopyFileRequest | MoveFileRequest) => Promise<{ success: boolean; message: string }>;
}

export default function CopyMoveModal({
  isOpen,
  onClose,
  action,
  item,
  onConfirm,
}: CopyMoveModalProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);

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
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const basePath = currentPath.trim();

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

  const summaryDestination = currentPath.trim();
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
                Navigate to the desired directory. The current view will be used as the destination.
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

          <div className="space-y-4">
            <FileList
              files={files}
              currentPath={currentPath}
              onNavigate={handleNavigate}
              loading={filesLoading}
            />
          </div>

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
              disabled={loading || filesLoading}
            >
              {loading ? loadingLabel : actionTitle}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
