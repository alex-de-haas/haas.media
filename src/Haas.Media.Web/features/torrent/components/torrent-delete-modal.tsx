"use client";

import { MouseEvent, useState } from "react";
import type { TorrentInfo } from "@/types/torrent";
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

interface TorrentDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  torrent: TorrentInfo | null;
  onConfirm: (hash: string) => Promise<{ success: boolean; message: string }>;
}

export default function TorrentDeleteModal({ isOpen, onClose, torrent, onConfirm }: TorrentDeleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!torrent) {
    return null;
  }

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
      const result = await onConfirm(torrent.hash);
      if (!result?.success) {
        setError(result?.message ?? "Delete failed");
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
          <AlertDialogTitle>Delete torrent</AlertDialogTitle>
          <AlertDialogDescription>
            <span>
              Are you sure you want to delete <strong>{torrent.name}</strong>?
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">This action cannot be undone.</p>
              <p className="text-muted-foreground">The torrent and all downloaded data will be permanently removed.</p>
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
