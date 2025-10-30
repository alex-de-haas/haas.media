"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useFiles } from "@/features/files";
import { useNotifications } from "@/lib/notifications";
import FileList from "@/features/files/components/file-list";
import FileActionsModal from "@/features/files/components/file-actions-modal";
import CopyOperationsList from "@/features/files/components/copy-operations-list";
import { FileUploadCard, EncodeModal } from "@/features/files";
import type { CopyRequest, CreateDirectoryRequest, FileItem, MoveRequest, RenameRequest } from "@/types/file";
import { FileItemType } from "@/types/file";
import { usePageTitle } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckSquare, Copy, Download, FolderPlus, MoreHorizontal, MoveRight, Pencil, Play, Settings, Trash2, X } from "lucide-react";
import { VideoPlayerDialog } from "@/components/ui/video-player-dialog";
import { useVideoPlayer } from "@/features/files/hooks/use-video-player";

interface FileActionsProps {
  item: FileItem;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
  onRename: () => void;
  onDownloadTorrent?: () => void;
  onPlayVideo?: () => void;
  onEncode?: () => void;
}

function FileActions({ item, onDelete, onCopy, onMove, onRename, onDownloadTorrent, onPlayVideo, onEncode }: FileActionsProps) {
  const t = useTranslations("files");
  const isTorrent = item.extension?.toLowerCase() === ".torrent";
  const isVideo =
    item.extension &&
    ["mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "ogv", "3gp"].includes(
      item.extension.toLowerCase().replace(".", ""),
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("actions")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isVideo && onPlayVideo && (
          <>
            <DropdownMenuItem onSelect={onPlayVideo} className="cursor-pointer">
              <Play className="h-4 w-4" />
              {t("playVideo")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {(item.type === FileItemType.Media || item.type === FileItemType.Directory) && onEncode && (
          <>
            <DropdownMenuItem onSelect={onEncode} className="cursor-pointer">
              <Settings className="h-4 w-4" />
              {t("encode")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {isTorrent && onDownloadTorrent && (
          <>
            <DropdownMenuItem onSelect={onDownloadTorrent} className="cursor-pointer">
              <Download className="h-4 w-4" />
              {t("downloadTorrent")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onCopy} className="cursor-pointer">
          <Copy className="h-4 w-4" />
          {t("copy")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove} className="cursor-pointer">
          <MoveRight className="h-4 w-4" />
          {t("move")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename} className="cursor-pointer">
          <Pencil className="h-4 w-4" />
          {t("rename")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="cursor-pointer text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4" />
          {t("delete", { ns: "common" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FilesPage() {
  const t = useTranslations("files");
  const { isOpen, videoPath, videoTitle, openVideo, setIsOpen, transcode, quality, showStreamInfo } = useVideoPlayer();

  const {
    files,
    copyOperations,
    currentPath,
    loading,
    error,
    navigateToPath,
    copy,
    cancelCopyOperation,
    move,
    deleteItem,
    createDirectory,
    rename,
    upload,
    downloadTorrentFromFile,
  } = useFiles();

  const { notify } = useNotifications();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [encodeModalOpen, setEncodeModalOpen] = useState(false);
  const [encodeFilePath, setEncodeFilePath] = useState<string>("");

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: "copy" | "move" | "delete" | "create-directory" | "rename" | null;
    items: FileItem[];
  }>({
    isOpen: false,
    action: null,
    items: [],
  });

  const [isUploading, setIsUploading] = useState(false);

  const openEncodeModal = useCallback((path: string) => {
    setEncodeFilePath(path);
    setEncodeModalOpen(true);
  }, []);

  const closeEncodeModal = useCallback(() => {
    setEncodeModalOpen(false);
    setEncodeFilePath("");
  }, []);

  const openModal = useCallback((action: "copy" | "move" | "delete" | "create-directory" | "rename", items?: FileItem | FileItem[]) => {
    const normalized = Array.isArray(items) ? items : items ? [items] : [];
    setModalState({ isOpen: true, action, items: normalized });
  }, []);

  const closeModal = () => {
    setModalState({ isOpen: false, action: null, items: [] });
  };

  type ModalPayload = CopyRequest | MoveRequest | CreateDirectoryRequest | RenameRequest | string;

  const handleModalConfirm = async (data: ModalPayload) => {
    const { action } = modalState;
    let result;

    switch (action) {
      case "copy":
        result = await copy(data as CopyRequest);
        break;
      case "move":
        result = await move(data as MoveRequest);
        break;
      case "delete":
        result = await deleteItem(data as string);
        break;
      case "create-directory":
        result = await createDirectory(data as CreateDirectoryRequest);
        break;
      case "rename":
        result = await rename(data as RenameRequest);
        break;
      default:
        result = { success: false, message: "Unknown action" };
    }

    notify({
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      if (action === "copy" || action === "move") {
        const sourcePath = (data as CopyRequest | MoveRequest).sourcePath;
        setSelectedPaths((prev) => {
          if (!prev.has(sourcePath)) return prev;
          const next = new Set(prev);
          next.delete(sourcePath);
          return next;
        });
      } else if (action === "delete") {
        const path = data as string;
        setSelectedPaths((prev) => {
          if (!prev.has(path)) return prev;
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      } else if (action === "rename") {
        const originalPath = (data as RenameRequest).path;
        setSelectedPaths((prev) => {
          if (!prev.has(originalPath)) return prev;
          const next = new Set(prev);
          next.delete(originalPath);
          return next;
        });
      }
    }
    return result;
  };

  useEffect(() => {
    setSelectedPaths(new Set());
  }, [currentPath]);

  useEffect(() => {
    setSelectedPaths((prev) => {
      if (prev.size === 0) {
        return prev;
      }

      const available = new Set(files.map((file) => file.relativePath));
      let changed = false;
      const next = new Set<string>();

      prev.forEach((path) => {
        if (available.has(path)) {
          next.add(path);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [files]);

  const selectedItems = useMemo(() => files.filter((file) => selectedPaths.has(file.relativePath)), [files, selectedPaths]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedPaths(new Set());
      }
      return !prev;
    });
  }, []);

  const handleToggleSelection = useCallback((item: FileItem) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(item.relativePath)) {
        next.delete(item.relativePath);
      } else {
        next.add(item.relativePath);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const handleFileUpload = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) {
      return {
        success: false,
        message: "No files selected.",
        uploaded: 0,
        skipped: 0,
        errors: [],
      };
    }

    setIsUploading(true);
    try {
      return await upload(selectedFiles);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTorrent = useCallback(
    async (path: string, name: string) => {
      const result = await downloadTorrentFromFile(path);
      notify({
        title: result.success ? t("torrentStarted") : t("torrentFailed"),
        message: result.success ? `${name} — ${result.message}` : `${name}: ${result.message}`,
        type: result.success ? "success" : "error",
      });
      return result;
    },
    [downloadTorrentFromFile, notify, t],
  );

  usePageTitle(t("title"));

  const singleItemActions = useMemo(
    () =>
      selectionMode
        ? undefined
        : (item: FileItem) => (
            <FileActions
              item={item}
              onDelete={() => openModal("delete", item)}
              onCopy={() => openModal("copy", item)}
              onMove={() => openModal("move", item)}
              onRename={() => openModal("rename", item)}
              {...(item.extension?.toLowerCase() === ".torrent"
                ? {
                    onDownloadTorrent: () => {
                      void handleDownloadTorrent(item.relativePath, item.name);
                    },
                  }
                : {})}
              onPlayVideo={() => openVideo(item.relativePath, item.name)}
              onEncode={() => openEncodeModal(item.relativePath)}
            />
          ),
    [handleDownloadTorrent, openModal, openVideo, openEncodeModal, selectionMode],
  );

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>{t("errorLoading")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FileUploadCard onUpload={handleFileUpload} isUploading={isUploading} currentPath={currentPath} />

      {/* File list */}
      <FileList
        files={files}
        currentPath={currentPath}
        onNavigate={navigateToPath}
        loading={loading}
        headerActions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={selectionMode ? "secondary" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              onClick={toggleSelectionMode}
            >
              {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {selectionMode ? t("done") : t("select")}
            </Button>
            <Button onClick={() => openModal("create-directory")} size="sm" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              {t("createDirectory")}
            </Button>
          </div>
        }
        selectionMode={selectionMode}
        selectedPaths={selectedPaths}
        onToggleSelect={handleToggleSelection}
        {...(singleItemActions && { renderActions: singleItemActions })}
      />

      {selectionMode ? (
        <section className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              {t("itemsSelected", { count: selectedItems.length, plural: selectedItems.length === 1 ? "" : "s" })}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={selectedItems.length === 0}
                onClick={() => openModal("copy", selectedItems)}
              >
                <Copy className="h-4 w-4" />
                {t("copy")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                disabled={selectedItems.length === 0}
                onClick={() => openModal("move", selectedItems)}
              >
                <MoveRight className="h-4 w-4" />
                {t("move")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="flex items-center gap-2"
                disabled={selectedItems.length === 0}
                onClick={() => openModal("delete", selectedItems)}
              >
                <Trash2 className="h-4 w-4" />
                {t("delete", { ns: "common" })}
              </Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={selectedItems.length === 0}>
              {t("clearSelection")}
            </Button>
          </div>
        </section>
      ) : null}

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        videoPath={videoPath}
        title={videoTitle}
        {...(transcode !== undefined && { transcode })}
        {...(quality && { quality })}
        {...(showStreamInfo !== undefined && { showStreamInfo })}
      />

      {/* Copy operations list */}
      <CopyOperationsList
        operations={copyOperations}
        onCancel={async (operationId) => {
          const result = await cancelCopyOperation(operationId);
          notify({
            message: result.message,
            type: result.success ? "success" : "error",
          });
          return result;
        }}
      />

      {/* Action modal */}
      <FileActionsModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        action={modalState.action}
        items={modalState.items}
        currentPath={currentPath}
        onConfirm={handleModalConfirm}
      />

      {/* Encode modal */}
      <EncodeModal isOpen={encodeModalOpen} onClose={closeEncodeModal} filePath={encodeFilePath} />
    </main>
  );
}
