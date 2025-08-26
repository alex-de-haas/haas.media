"use client";

import DeleteModal from "./delete-modal";
import CreateDirectoryModal from "./create-directory-modal";
import CopyMoveModal from "./copy-move-modal";
import type { FileItem, CopyFileRequest, MoveFileRequest, CreateDirectoryRequest } from "@/types/file";

interface FileActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move" | "delete" | "create-directory" | null;
  item?: FileItem;
  currentPath: string;
  onConfirm: (data: any) => Promise<{ success: boolean; message: string }>;
}

export default function FileActionsModal({
  isOpen,
  onClose,
  action,
  item,
  currentPath,
  onConfirm,
}: FileActionsModalProps) {
  if (!isOpen || !action) return null;

  // Handle delete action
  if (action === "delete" && item) {
    return (
      <DeleteModal
        isOpen={true}
        onClose={onClose}
        item={item}
        onConfirm={onConfirm}
      />
    );
  }

  // Handle create directory action
  if (action === "create-directory") {
    return (
      <CreateDirectoryModal
        isOpen={true}
        onClose={onClose}
        currentPath={currentPath}
        onConfirm={onConfirm}
      />
    );
  }

  // Handle copy and move actions
  if ((action === "copy" || action === "move") && item) {
    return (
      <CopyMoveModal
        isOpen={true}
        onClose={onClose}
        action={action}
        item={item}
        onConfirm={onConfirm}
      />
    );
  }

  return null;
}
