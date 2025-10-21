"use client";

import { MouseEvent, useMemo, useState } from "react";
import { FileItemType } from "@/types/file";
import type { FileItem } from "@/types/file";
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
import { TriangleAlert } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FileItem[];
  onConfirm: (path: string) => Promise<{ success: boolean; message: string }>;
}

export default function DeleteModal({ isOpen, onClose, items, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(() => items.filter(Boolean), [items]);
  const [primary] = targets;
  if (!primary) {
    return null;
  }
  const isBulk = targets.length > 1;

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      setError(null);
      onClose();
    }
  };

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      let failureMessage: string | null = null;

      for (const target of targets) {
        const result = await onConfirm(target.relativePath);
        if (!result?.success) {
          failureMessage = result?.message ?? "Delete failed";
          break;
        }
      }

      if (failureMessage) {
        setError(failureMessage);
        return;
      }

      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {isBulk ? `${targets.length} items` : primary.type === FileItemType.Directory ? "directory" : "file"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBulk ? (
              <div className="space-y-2">
                <p>Are you sure you want to delete the following items?</p>
                <ul className="space-y-1 text-sm text-foreground">
                  {targets.slice(0, 5).map((target: FileItem) => (
                    <li key={target.relativePath}>
                      <span className="font-medium">{target.name}</span>
                    </li>
                  ))}
                  {targets.length > 5 ? (
                    <li className="text-muted-foreground">
                      +{targets.length - 5} more item{targets.length - 5 === 1 ? "" : "s"}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <span>
                Are you sure you want to delete <strong>{primary.name}</strong>?
                {primary.type === FileItemType.Directory && " This will delete the directory and all of its contents."}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">This action cannot be undone.</p>
              <p className="text-muted-foreground">
                {isBulk
                  ? "All selected items will be permanently removed."
                  : primary.type === FileItemType.Directory
                    ? "All nested files and folders will be permanently removed."
                    : "The file will be permanently removed."}
              </p>
            </div>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
