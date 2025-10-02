export enum BackgroundTaskStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4,
}

export interface BackgroundTaskInfo {
  id: string;
  type: string;
  name: string;
  status: BackgroundTaskStatus;
  progress: number;
  statusMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  payload?: unknown;
  errorMessage?: string | null;
}

export const isActiveBackgroundTask = (task: BackgroundTaskInfo): boolean =>
  task.status === BackgroundTaskStatus.Pending ||
  task.status === BackgroundTaskStatus.Running;

export const backgroundTaskStatusLabel = (status: BackgroundTaskStatus): string => {
  switch (status) {
    case BackgroundTaskStatus.Pending:
      return "Pending";
    case BackgroundTaskStatus.Running:
      return "Running";
    case BackgroundTaskStatus.Completed:
      return "Completed";
    case BackgroundTaskStatus.Failed:
      return "Failed";
    case BackgroundTaskStatus.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
};
