"use client";

import { useRef } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications";
import { useFileUpload } from "../hooks/useFileUpload";

export interface FileUploadCardProps {
  onUpload: (files: File[]) => Promise<{
    success: boolean;
    message: string;
    uploaded: number;
    skipped: number;
    errors: string[];
  }>;
  isUploading?: boolean;
  currentPath?: string;
  acceptExtensions?: string[];
}

export function FileUploadCard({ onUpload, isUploading = false, currentPath, acceptExtensions }: FileUploadCardProps) {
  const t = useTranslations("files");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { notify } = useNotifications();
  const { files, dragActive, handleFileChange, handleDragOver, handleDragLeave, handleDrop, clearFiles, removeFile } =
    useFileUpload(acceptExtensions);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const handleInvalidFile = (message: string) => {
    notify({ title: t("invalidFile"), message, type: "warning" });
  };

  const handleUpload = async () => {
    if (!files.length) return;

    const result = await onUpload(files);
    const hasPartialSuccess = result.uploaded > 0 && result.errors.length > 0;
    notify({
      title: result.success ? t("uploadComplete") : hasPartialSuccess ? t("uploadPartial") : t("uploadFailed"),
      message: result.message,
      type: result.success ? "success" : hasPartialSuccess ? "warning" : "error",
    });
    if (result.success || hasPartialSuccess) {
      clearFiles();
    }
  };

  const openFileDialog = () => fileInputRef.current?.click();

  const acceptAttribute = acceptExtensions?.length ? acceptExtensions.join(",") : undefined;

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-4 pt-6">
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex min-h-[224px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-muted-foreground/40 bg-muted/30 px-6 text-center transition-colors",
            "outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            dragActive && "border-primary bg-primary/10",
          )}
          onClick={openFileDialog}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFileDialog();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(event) => handleDrop(event, handleInvalidFile)}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("dropFilesHere")}</p>
            <p className="text-sm text-muted-foreground">
              {t("or")}
              <Button
                type="button"
                variant="link"
                className="px-1"
                onClick={(event) => {
                  event.stopPropagation();
                  openFileDialog();
                }}
              >
                {t("browseFromDevice")}
              </Button>
            </p>
            <p className="text-xs text-muted-foreground">{t("duplicatesSkipped")}</p>
          </div>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            className="hidden"
            multiple
            accept={acceptAttribute}
            onChange={(event) => handleFileChange(event, handleInvalidFile)}
          />
        </div>

        {files.length > 0 && (
          <div className="rounded-lg border border-border bg-background">
            <ScrollArea className="h-44">
              <ul className="divide-y divide-border/60">
                {files.map((file, index) => (
                  <li key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile(index);
                      }}
                      disabled={isUploading}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      <span className="sr-only">
                        {t("remove")} {file.name}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-dashed border-border/80 bg-muted/20 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <span>
          {t("targetDirectory")} {currentPath ? `/${currentPath}` : "/"}
        </span>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="sm:min-w-[96px]"
            onClick={() => clearFiles()}
            disabled={isUploading || files.length === 0}
          >
            {t("clear")}
          </Button>
          <Button type="button" className="sm:min-w-[120px]" onClick={handleUpload} disabled={isUploading || files.length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> {t("uploading")}
              </>
            ) : (
              t("upload")
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
