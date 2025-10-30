"use client";

import { FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface MetadataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (refreshExistingData: boolean) => Promise<void>;
  isSyncing: boolean;
}

export default function MetadataSyncModal({ isOpen, onClose, onConfirm, isSyncing }: MetadataSyncModalProps) {
  const [refreshExistingData, setRefreshExistingData] = useState(true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onConfirm(refreshExistingData);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSyncing) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Metadata Sync</DialogTitle>
          <DialogDescription>Scan configured directories for new media files and refresh metadata from TMDB.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will scan all configured movie and TV show directories for new files and update metadata.
            </p>

            <div className="flex items-start space-x-3 rounded-md border p-4">
              <Checkbox
                id="refreshExistingData"
                checked={refreshExistingData}
                onCheckedChange={(checked) => setRefreshExistingData(checked === true)}
                disabled={isSyncing}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor="refreshExistingData"
                  className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Refresh existing data
                </Label>
                <p className="text-sm text-muted-foreground">
                  Re-fetch metadata from TMDB for existing movies, TV shows, and people. Uncheck to only add new items.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSyncing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Sync
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
