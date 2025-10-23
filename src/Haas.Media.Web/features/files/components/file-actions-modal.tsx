"use client";

import DeleteModal from "./delete-modal";
import CreateDirectoryModal from "./create-directory-modal";
import CopyMoveModal from "./copy-move-modal";
import RenameModal from "./rename-modal";
import type { FileItem, CopyRequest, MoveRequest, CreateDirectoryRequest, RenameRequest } from "@/types/file";

interface FileActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move" | "delete" | "create-directory" | "rename" | null;
  items: FileItem[];
  currentPath: string;
  onConfirm: (
    data: CopyRequest | MoveRequest | CreateDirectoryRequest | RenameRequest | string,
  ) => Promise<{ success: boolean; message: string }>;
}

export default function FileActionsModal({ isOpen, onClose, action, items, currentPath, onConfirm }: FileActionsModalProps) {
  if (!isOpen || !action) return null;

  // Handle delete action
  if (action === "delete" && items.length > 0) {
    return <DeleteModal isOpen={true} onClose={onClose} items={items} onConfirm={onConfirm} />;
  }

  // Handle create directory action
  if (action === "create-directory") {
    return <CreateDirectoryModal isOpen={true} onClose={onClose} currentPath={currentPath} onConfirm={onConfirm} />;
  }

  // Handle rename action
  if (action === "rename" && items.length > 0) {
    const [item] = items;
    if (!item) {
      return null;
    }
    return <RenameModal isOpen={true} onClose={onClose} item={item} onConfirm={onConfirm} />;
  }

  // Handle copy and move actions
  if ((action === "copy" || action === "move") && items.length > 0) {
    return <CopyMoveModal isOpen={true} onClose={onClose} action={action} items={items} onConfirm={onConfirm} />;
  }

  return null;
}
