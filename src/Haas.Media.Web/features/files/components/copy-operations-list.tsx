"use client";

import { formatSize } from "@/lib/utils";
import type { CopyOperationInfo } from "@/types/file";
import { CopyOperationState } from "@/types/file";

interface CopyOperationsListProps {
  operations: CopyOperationInfo[];
  onCancel: (operationId: string) => Promise<{ success: boolean; message: string }>;
}

const getStateColor = (state: CopyOperationState): string => {
  switch (state) {
    case CopyOperationState.Running:
      return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/40";
    case CopyOperationState.Completed:
      return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/40";
    case CopyOperationState.Failed:
      return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40";
    case CopyOperationState.Cancelled:
      return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    default:
      return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
  }
};

const getStateName = (state: CopyOperationState): string => {
  switch (state) {
    case CopyOperationState.Running:
      return "Running";
    case CopyOperationState.Completed:
      return "Completed";
    case CopyOperationState.Failed:
      return "Failed";
    case CopyOperationState.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
};

export default function CopyOperationsList({ operations, onCancel }: CopyOperationsListProps) {
  if (operations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow rounded-lg dark:bg-gray-800">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 dark:text-gray-100">
          Copy Operations ({operations.length})
        </h3>
        <div className="space-y-4">
          {operations.map((operation) => (
            <div
              key={operation.id}
              className="border border-gray-200 rounded-lg p-4 space-y-3 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateColor(
                      operation.state
                    )}`}
                  >
                    {getStateName(operation.state)}
                  </span>
                  {operation.state === CopyOperationState.Running && (
                    <button
                      onClick={() => onCancel(operation.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium dark:text-red-400 dark:hover:text-red-300"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(operation.startTime).toLocaleTimeString()}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">From:</span> {operation.sourcePath}
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">To:</span> {operation.destinationPath}
                </div>
              </div>

              {operation.state === CopyOperationState.Running && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      {formatSize(operation.copiedBytes)} / {formatSize(operation.totalBytes)}
                    </span>
                    <span>{operation.progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 dark:bg-blue-500"
                      style={{ width: `${operation.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {operation.state === CopyOperationState.Completed && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  ✓ Completed {formatSize(operation.totalBytes)} in{" "}
                  {operation.completedTime &&
                    Math.round(
                      (new Date(operation.completedTime).getTime() -
                        new Date(operation.startTime).getTime()) /
                        1000
                    )}s
                </div>
              )}

              {operation.state === CopyOperationState.Failed && operation.errorMessage && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  ✗ Failed: {operation.errorMessage}
                </div>
              )}

              {operation.state === CopyOperationState.Cancelled && (
                <div className="text-sm text-gray-600 dark:text-gray-400">⊗ Operation was cancelled</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
