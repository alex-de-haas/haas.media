"use client";

import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { FileItemType } from "@/types/file";
import type { FileItem } from "@/types/file";
import { formatFileSize, formatDate } from "@/lib/utils/format";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronRight, File as FileIconOutline, Folder, Image as ImageIcon, Music, Video } from "lucide-react";

interface FileListProps {
  files: FileItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  loading?: boolean;
  renderActions?: (item: FileItem) => ReactNode;
  headerActions?: ReactNode;
  scrollable?: boolean;
  maxHeightClassName?: string;
  selectionMode?: boolean;
  selectedPaths?: Set<string>;
  onToggleSelect?: (item: FileItem) => void;
  disabledPaths?: Set<string>;
  disabledMessage?: string;
}

function FileIcon({ item }: { item: FileItem }) {
  if (item.type === FileItemType.Directory) {
    return <Folder className="h-5 w-5 text-primary" />;
  }

  const extension = item.extension?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) {
    return <ImageIcon className="h-5 w-5 text-green-500" />;
  }

  if (extension && ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(extension)) {
    return <Video className="h-5 w-5 text-purple-500" />;
  }

  if (extension && ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)) {
    return <Music className="h-5 w-5 text-red-500" />;
  }

  return <FileIconOutline className="h-5 w-5 text-muted-foreground" />;
}

export default function FileList({
  files,
  currentPath,
  onNavigate,
  loading,
  renderActions,
  headerActions,
  scrollable = false,
  maxHeightClassName,
  selectionMode = false,
  selectedPaths,
  onToggleSelect,
  disabledPaths,
  disabledMessage = "Already selected",
}: FileListProps) {
  const t = useTranslations("files");
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];
  const maxHeightClass = scrollable ? (maxHeightClassName ?? "max-h-[60vh]") : undefined;

  const handleItemClick = (item: FileItem) => {
    const isDisabled = disabledPaths?.has(item.relativePath) ?? false;
    if (isDisabled) {
      return;
    }

    if (selectionMode) {
      onToggleSelect?.(item);
      return;
    }

    if (item.type === FileItemType.Directory) {
      onNavigate(item.relativePath);
    }
  };

  return (
    <Card className={cn("overflow-hidden", scrollable && "flex flex-col", maxHeightClass)}>
      <CardHeader className="border-b bg-muted/40 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Button type="button" variant="link" size="sm" className="h-7 px-0" onClick={() => onNavigate("")}>
              {t("title")}
            </Button>
            {pathParts.map((part, index) => {
              const pathToHere = pathParts.slice(0, index + 1).join("/");
              return (
                <div key={pathToHere} className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3" />
                  <Button type="button" variant="link" size="sm" className="h-7 px-0" onClick={() => onNavigate(pathToHere)}>
                    {part}
                  </Button>
                </div>
              );
            })}
          </div>
          {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn("p-0", scrollable && "flex-1 overflow-y-auto")}>
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner className="size-8" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <Folder className="h-10 w-10 text-muted-foreground/30" />
            <span>{t("emptyDirectory")}</span>
          </div>
        ) : (
          <div className="divide-y">
            {files.map((item) => {
              const isSelected = selectedPaths?.has(item.relativePath) ?? false;
              const isDisabled = disabledPaths?.has(item.relativePath) ?? false;
              return (
                <div
                  key={item.relativePath}
                  className={cn(
                    "flex items-center justify-between gap-4 px-4 py-3 sm:px-6",
                    selectionMode && !isDisabled && "hover:bg-muted/40",
                    isSelected && "bg-muted/40",
                    isDisabled && "opacity-50 cursor-not-allowed",
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <div
                    className={cn(
                      "flex flex-1 items-center gap-3 overflow-hidden",
                      !selectionMode && item.type === FileItemType.Directory && !isDisabled && "cursor-pointer hover:text-foreground",
                      selectionMode && !isDisabled && "cursor-pointer",
                    )}
                  >
                    {selectionMode ? (
                      <div onClick={(event) => event.stopPropagation()} className="flex items-center justify-center">
                        <Checkbox
                          checked={isSelected}
                          disabled={isDisabled}
                          onCheckedChange={() => !isDisabled && onToggleSelect?.(item)}
                          aria-label={isSelected ? `Deselect ${item.name}` : `Select ${item.name}`}
                        />
                      </div>
                    ) : null}
                    <FileIcon item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.type === FileItemType.Directory ? (
                          isDisabled ? (
                            <span className="text-xs italic">{disabledMessage}</span>
                          ) : (
                            <></>
                          )
                        ) : (
                          <>
                            <span>{formatFileSize(item.size || 0)}</span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>{formatDate(item.lastModified)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {!selectionMode && renderActions ? renderActions(item) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
