"use client";

import { FormEvent, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

interface MetadataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (refreshExistingData: boolean) => Promise<void>;
  isSyncing: boolean;
}

export default function MetadataSyncModal({ isOpen, onClose, onConfirm, isSyncing }: MetadataSyncModalProps) {
  const [refreshExistingData, setRefreshExistingData] = useState(true);
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");

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
          <DialogTitle>{t("metadataSyncModalTitle")}</DialogTitle>
          <DialogDescription>{t("metadataSyncModalDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("metadataSyncModalInfo")}</p>

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
                  {t("refreshExistingData")}
                </Label>
                <p className="text-sm text-muted-foreground">{t("refreshExistingDataDescription")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSyncing}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t("startingSyncButton")}
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("startSyncButton")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
