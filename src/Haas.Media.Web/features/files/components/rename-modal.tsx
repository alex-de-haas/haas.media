"use client";

import { FormEvent, useEffect, useState } from "react";
import { FileItemType } from "@/types/file";
import type { FileItem, RenameRequest } from "@/types/file";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem;
  onConfirm: (data: RenameRequest) => Promise<{ success: boolean; message: string }>;
}

export default function RenameModal({ isOpen, onClose, item, onConfirm }: RenameModalProps) {
  const [newName, setNewName] = useState(item.name);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewName(item.name);
      setLoading(false);
    }
  }, [isOpen, item.name]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setLoading(false);
      setNewName(item.name);
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === item.name) {
      handleOpenChange(false);
      return;
    }

    setLoading(true);
    try {
      const result = await onConfirm({
        path: item.relativePath,
        newName: trimmedName,
      });

      if (result.success) {
        handleOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {item.type === FileItemType.Directory ? "directory" : "file"}</DialogTitle>
          <DialogDescription>
            Choose a new name for <span className="font-medium text-foreground">{item.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newName">New name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder={`Enter new ${item.type === FileItemType.Directory ? "directory" : "file"} name`}
              disabled={loading}
              autoFocus
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !newName.trim() || newName.trim() === item.name}>
              {loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
