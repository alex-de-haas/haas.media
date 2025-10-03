# File Action Modals

This directory contains modal components for file operations. The modals have been separated for better maintainability and single responsibility principle.

## Components

### FileActionsModal

The main orchestrator component that renders the appropriate modal based on the action type.

**Props:**

- `isOpen`: Whether any modal should be open
- `onClose`: Function to close the modal
- `action`: The type of action ("copy" | "move" | "delete" | "create-directory" | null)
- `item`: The file item for operations (required for copy/move/delete)
- `currentPath`: Current directory path (used for create-directory)
- `onConfirm`: Callback function to handle the operation

### DeleteModal

Handles file and directory deletion with confirmation.

**Features:**

- Warning message for destructive action
- Special handling for directory deletion
- Loading state during operation

### CreateDirectoryModal

Handles creation of new directories.

**Features:**

- Input validation for directory name
- Shows target path where directory will be created
- Auto-focus on input field

### CopyMoveModal

Handles both copy and move operations for files and directories.

**Features:**

- Unified interface for copy and move operations
- Input validation for destination path
- Different messaging based on operation type
- Warning for move operations

## Usage

```tsx
import { FileActionsModal } from "@/features/files/components";

// In your component
<FileActionsModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  action={currentAction}
  item={selectedItem}
  currentPath={currentPath}
  onConfirm={handleFileOperation}
/>;
```

## Type Safety

All components use proper TypeScript interfaces:

- `FileItem` for file/directory information
- `CopyFileRequest` / `MoveFileRequest` for copy/move operations
- `CreateDirectoryRequest` for directory creation

## Styling

Components follow the project's Tailwind CSS guidelines and include:

- Dark mode support
- Consistent button styling
- Proper focus states for accessibility
- Loading states
- Responsive design
