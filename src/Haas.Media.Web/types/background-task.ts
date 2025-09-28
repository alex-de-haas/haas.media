export enum BackgroundTaskState {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3,
  Cancelled = 4,
}

export interface BackgroundTaskInfo {
  id: string;
  name: string;
  state: BackgroundTaskState;
  progress: number;
  statusMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  payload?: unknown;
  errorMessage?: string | null;
}

export const isActiveBackgroundTask = (task: BackgroundTaskInfo): boolean =>
  task.state === BackgroundTaskState.Pending || task.state === BackgroundTaskState.Running;

export const backgroundTaskStateLabel = (state: BackgroundTaskState): string => {
  switch (state) {
    case BackgroundTaskState.Pending:
      return "Pending";
    case BackgroundTaskState.Running:
      return "Running";
    case BackgroundTaskState.Completed:
      return "Completed";
    case BackgroundTaskState.Failed:
      return "Failed";
    case BackgroundTaskState.Cancelled:
      return "Cancelled";
    default:
      return "Unknown";
  }
};
