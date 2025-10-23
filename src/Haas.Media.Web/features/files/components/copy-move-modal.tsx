"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { FileItem, CopyRequest, MoveRequest } from "@/types/file";
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
import FileList from "./file-list";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

interface CopyMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move";
  items: FileItem[];
  onConfirm: (data: CopyRequest | MoveRequest) => Promise<{ success: boolean; message: string }>;
}

export default function CopyMoveModal({ isOpen, onClose, action, items, onConfirm }: CopyMoveModalProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(() => items.filter(Boolean), [items]);
  const [primary] = targets;
  const isBulk = targets.length > 1;

  const actionTitle = useMemo(() => (action === "copy" ? "Copy" : "Move"), [action]);
  const loadingLabel = useMemo(() => (action === "copy" ? "Copying..." : "Moving..."), [action]);

  const fetchFiles = async (path?: string) => {
    setFilesLoading(true);
    try {
      const url = new URL(`${downloaderApi}/api/files`);
      if (path) url.searchParams.set("path", path);

      const data = await fetchJsonWithAuth<FileItem[]>(url.toString());
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

  useEffect(() => {
    setError(null);
  }, [isOpen, targets]);

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const basePath = currentPath.trim();

    setLoading(true);
    setError(null);
    try {
      let failureMessage: string | null = null;

      for (const target of targets) {
        const destinationPath = basePath ? `${basePath}/${target.name}` : target.name;
        const result = await onConfirm({
          sourcePath: target.relativePath,
          destinationPath,
        });

        if (!result?.success) {
          failureMessage = result?.message ?? `${actionTitle} failed.`;
          break;
        }
      }

      if (failureMessage) {
        setError(failureMessage);
        return;
      }

      handleOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const summaryDestination = currentPath.trim();
  const previewDirectory = summaryDestination || "(root)";
  const finalDestinationSummary = summaryDestination && primary ? `${summaryDestination}/${primary.name}` : (primary?.name ?? "");

  if (!primary) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isBulk ? `${actionTitle} ${targets.length} items` : `${actionTitle} ${primary.name}`}</DialogTitle>
          <DialogDescription>
            {isBulk ? (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="text-sm text-foreground">Current selection:</p>
                <ul className="space-y-1">
                  {targets.slice(0, 5).map((target: FileItem) => (
                    <li key={target.relativePath} className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{target.name}</span>
                      <span className="text-muted-foreground/60">({target.relativePath})</span>
                    </li>
                  ))}
                  {targets.length > 5 ? (
                    <li className="text-muted-foreground/80">
                      +{targets.length - 5} more item{targets.length - 5 === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <span>
                Current location: <span className="font-medium text-foreground">{primary.relativePath}</span>
              </span>
            )}
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
            <Button type="button" variant="outline" size="sm" onClick={() => fetchFiles(currentPath)} disabled={filesLoading}>
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
              scrollable
              maxHeightClassName="max-h-[55vh]"
            />
          </div>

          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <Badge variant="outline">Destination</Badge>
              <span className="font-mono text-xs text-foreground">{previewDirectory}</span>
            </div>
            {isBulk ? (
              <p className="mt-2 text-xs text-muted-foreground">Each selected item will be placed in this directory.</p>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                Final path: <span className="font-mono text-foreground">{finalDestinationSummary}</span>
              </p>
            )}
            {action === "move" && (
              <p className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                Moving will remove the source after completion.
              </p>
            )}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || filesLoading}>
              {loading ? loadingLabel : actionTitle}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
