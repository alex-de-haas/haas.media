"use client";

import { FormEvent, useState } from "react";
import type { CreateDirectoryRequest } from "@/types/file";
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
import { Label } from "@/components/ui/label";

interface CreateDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onConfirm: (data: CreateDirectoryRequest) => Promise<{ success: boolean; message: string }>;
}

export default function CreateDirectoryModal({
  isOpen,
  onClose,
  currentPath,
  onConfirm,
}: CreateDirectoryModalProps) {
  const [directoryName, setDirectoryName] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setDirectoryName("");
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directoryName.trim()) return;

    setLoading(true);

    try {
      const newPath = currentPath ? `${currentPath}/${directoryName.trim()}` : directoryName.trim();
      const result = await onConfirm({ path: newPath });

      if (result?.success) {
        reset();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create directory</DialogTitle>
          <DialogDescription>
            The new directory will be created in <span className="font-medium text-foreground">{currentPath || "root"}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="directoryName">Directory name</Label>
            <Input
              id="directoryName"
              autoFocus
              value={directoryName}
              onChange={(event) => setDirectoryName(event.target.value)}
              placeholder="Enter directory name"
              disabled={loading}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !directoryName.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
