"use client";

import { ReactNode } from "react";
import { FileItemType } from "@/types/file";
import type { FileItem } from "@/types/file";
import { formatFileSize, formatDate } from "@/lib/utils/format";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  File as FileIconOutline,
  Folder,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";

interface FileListProps {
  files: FileItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  loading?: boolean;
  renderActions?: (item: FileItem) => ReactNode;
}

function FileIcon({ item }: { item: FileItem }) {
  if (item.type === FileItemType.Directory) {
    return <Folder className="h-5 w-5 text-primary" />;
  }

  const extension = item.extension?.toLowerCase();

  if (
    extension &&
    ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)
  ) {
    return <ImageIcon className="h-5 w-5 text-green-500" />;
  }

  if (
    extension &&
    ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(extension)
  ) {
    return <Video className="h-5 w-5 text-purple-500" />;
  }

  if (
    extension &&
    ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)
  ) {
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
}: FileListProps) {
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const handleItemClick = (item: FileItem) => {
    if (item.type === FileItemType.Directory) {
      onNavigate(item.relativePath);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4 border-b bg-muted/40 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-7 px-0"
            onClick={() => onNavigate("")}
          >
            Files
          </Button>
          {pathParts.map((part, index) => {
            const pathToHere = pathParts.slice(0, index + 1).join("/");
            return (
              <div key={pathToHere} className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-7 px-0"
                  onClick={() => onNavigate(pathToHere)}
                >
                  {part}
                </Button>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
            <Folder className="h-10 w-10 text-muted-foreground/30" />
            <span>This directory is empty</span>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y">
              {files.map((item) => (
                <div
                  key={item.relativePath}
                  className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
                >
                  <div
                    className={cn(
                      "flex flex-1 items-center gap-3 overflow-hidden",
                      item.type === FileItemType.Directory &&
                        "cursor-pointer hover:text-foreground"
                    )}
                    onClick={() => handleItemClick(item)}
                  >
                    <FileIcon item={item} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.type === FileItemType.Directory ? (
                          <></>
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
                  {renderActions && renderActions(item)}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
