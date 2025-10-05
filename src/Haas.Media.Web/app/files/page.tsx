"use client";

import { useCallback, useState } from "react";
import { useFiles } from "@/features/files";
import { useNotifications } from "@/lib/notifications";
import FileList from "@/features/files/components/file-list";
import FileActionsModal from "@/features/files/components/file-actions-modal";
import CopyOperationsList from "@/features/files/components/copy-operations-list";
import { FileUploadCard } from "@/features/files";
import type { CopyRequest, CreateDirectoryRequest, FileItem, MoveRequest, RenameRequest } from "@/types/file";
import { FileItemType } from "@/types/file";
import { usePageTitle } from "@/components/layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, Download, ExternalLink, FolderPlus, Info, MoreHorizontal, MoveRight, Pencil, Play, Trash2 } from "lucide-react";
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
}

function FileActions({ item, onDelete, onCopy, onMove, onRename, onDownloadTorrent, onPlayVideo }: FileActionsProps) {
  const isTorrent = item.extension?.toLowerCase() === ".torrent";
  const isVideo = item.extension && ["mp4", "mkv", "webm", "avi", "mov", "wmv", "flv", "m4v", "mpg", "mpeg", "ogv", "3gp"].includes(
    item.extension.toLowerCase().replace(".", "")
  );
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="File actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isVideo && onPlayVideo && (
          <>
            <DropdownMenuItem onSelect={onPlayVideo} className="cursor-pointer">
              <Play className="h-4 w-4" />
              Play video
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {(item.type === FileItemType.Media || item.type === FileItemType.Directory) && (
          <DropdownMenuItem asChild>
            <Link prefetch={false} href={`/media-info/${encodeURIComponent(item.relativePath)}`} className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Media info
              <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </DropdownMenuItem>
        )}
        {(item.type === FileItemType.Media || item.type === FileItemType.Directory) && <DropdownMenuSeparator />}
        {isTorrent && onDownloadTorrent && (
          <>
            <DropdownMenuItem onSelect={onDownloadTorrent} className="cursor-pointer">
              <Download className="h-4 w-4" />
              Download torrent
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onCopy} className="cursor-pointer">
          <Copy className="h-4 w-4" />
          Copy
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onMove} className="cursor-pointer">
          <MoveRight className="h-4 w-4" />
          Move
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onRename} className="cursor-pointer">
          <Pencil className="h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="cursor-pointer text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function FilesPage() {
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

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: "copy" | "move" | "delete" | "create-directory" | "rename" | null;
    item?: FileItem;
  }>({
    isOpen: false,
    action: null,
  });

  const [isUploading, setIsUploading] = useState(false);

  const openModal = useCallback((action: "copy" | "move" | "delete" | "create-directory" | "rename", item?: FileItem) => {
    setModalState({ isOpen: true, action, ...(item && { item }) });
  }, []);

  const closeModal = () => {
    setModalState({ isOpen: false, action: null });
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
    return result;
  };

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

  const handleDownloadTorrent = async (path: string, name: string) => {
    const result = await downloadTorrentFromFile(path);
    notify({
      title: result.success ? "Torrent download started" : "Torrent start failed",
      message: result.success ? `${name} — ${result.message}` : `${name}: ${result.message}`,
      type: result.success ? "success" : "error",
    });
    return result;
  };

  usePageTitle("Files");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error loading files</AlertTitle>
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
          <Button onClick={() => openModal("create-directory")} size="sm" className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4" />
            Create directory
          </Button>
        }
        renderActions={(item: FileItem) => (
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
          />
        )}
      />

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
        {...(modalState.item && { item: modalState.item })}
        currentPath={currentPath}
        onConfirm={handleModalConfirm}
      />
    </main>
  );
}
