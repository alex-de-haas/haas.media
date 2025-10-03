"use client";

import { MouseEvent, useState } from "react";
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
  item: FileItem;
  onConfirm: (path: string) => Promise<{ success: boolean; message: string }>;
}

export default function DeleteModal({ isOpen, onClose, item, onConfirm }: DeleteModalProps) {
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      onClose();
    }
  };

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const result = await onConfirm(item.relativePath);
      if (result?.success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {item.type === FileItemType.Directory ? "directory" : "file"}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{item.name}</strong>?
            {item.type === FileItemType.Directory && " This will delete the directory and all of its contents."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">This action cannot be undone.</p>
              <p className="text-muted-foreground">
                {item.type === FileItemType.Directory
                  ? "All nested files and folders will be permanently removed."
                  : "The file will be permanently removed."}
              </p>
            </div>
          </div>
        </div>

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
