"use client";

import { useCallback, useEffect, useRef } from "react";
import { useBackgroundTasks } from "../hooks/useBackgroundTasks";
import { useNotifications } from "@/lib/notifications";
import { BackgroundTaskStatus, type BackgroundTaskInfo } from "@/types";
import type {
  AddToLibraryOperationInfo,
  MetadataRefreshOperationInfo,
  ScanOperationInfo,
} from "@/types/metadata";
import { LibraryType } from "@/types/library";

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const toOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const formatPeopleSummary = (
  total?: number,
  synced?: number,
  failed?: number
): string | null => {
  if (!total || total <= 0) {
    return null;
  }

  const syncedSafe = Math.max(0, Math.min(toNumber(synced), total));
  const failedSafe = Math.max(0, toNumber(failed));

  return failedSafe > 0
    ? `People ${syncedSafe}/${total} (${failedSafe} failed)`
    : `People ${syncedSafe}/${total}`;
};

const parseScanOperation = (
  task: BackgroundTaskInfo
): ScanOperationInfo | null => {
  if (!task.payload || typeof task.payload !== "object") {
    return null;
  }

  const raw = task.payload as Record<string, unknown>;

  return {
    id: toOptionalString(raw.id) ?? task.id,
    libraryPath: toOptionalString(raw.libraryPath) ?? "All Libraries",
    libraryTitle: toOptionalString(raw.libraryTitle) ?? "Library scan",
    totalFiles: toNumber(raw.totalFiles),
    processedFiles: toNumber(raw.processedFiles),
    foundMetadata: toNumber(raw.foundMetadata),
    startTime:
      toOptionalString(raw.startTime) ?? task.startedAt ?? task.createdAt,
    currentFile: toOptionalString(raw.currentFile),
    totalPeople: toNumber(raw.totalPeople),
    syncedPeople: toNumber(raw.syncedPeople),
    failedPeople: toNumber(raw.failedPeople),
  };
};

const parseRefreshOperation = (
  task: BackgroundTaskInfo
): MetadataRefreshOperationInfo | null => {
  if (!task.payload || typeof task.payload !== "object") {
    return null;
  }

  const raw = task.payload as Record<string, unknown>;

  return {
    id: toOptionalString(raw.id) ?? task.id,
    totalItems: toNumber(raw.totalItems),
    processedItems: toNumber(raw.processedItems),
    totalMovies: toNumber(raw.totalMovies),
    processedMovies: toNumber(raw.processedMovies),
    totalTvShows: toNumber(raw.totalTvShows),
    processedTvShows: toNumber(raw.processedTvShows),
    stage: toOptionalString(raw.stage) ?? "Completed",
    currentTitle: toOptionalString(raw.currentTitle),
    startedAt: toOptionalString(raw.startedAt),
    completedAt: toOptionalString(raw.completedAt),
    lastError: toOptionalString(raw.lastError),
    totalPeople: toNumber(raw.totalPeople),
    syncedPeople: toNumber(raw.syncedPeople),
    failedPeople: toNumber(raw.failedPeople),
  };
};

const parseAddToLibraryOperation = (
  task: BackgroundTaskInfo
): AddToLibraryOperationInfo | null => {
  if (!task.payload || typeof task.payload !== "object") {
    return null;
  }

  const raw = task.payload as Record<string, unknown>;
  const libraryTypeRaw = raw.libraryType;
  const numericType =
    typeof libraryTypeRaw === "number"
      ? libraryTypeRaw
      : Number(libraryTypeRaw);

  return {
    id: toNumber(raw.id),
    libraryId: toOptionalString(raw.libraryId) ?? "",
    libraryType: Number.isFinite(numericType)
      ? (numericType as LibraryType)
      : LibraryType.Movies,
    libraryTitle: toOptionalString(raw.libraryTitle),
    stage: toOptionalString(raw.stage) ?? "Completed",
    startTime:
      toOptionalString(raw.startTime) ?? task.startedAt ?? task.createdAt,
    title: toOptionalString(raw.title),
    posterPath: toOptionalString(raw.posterPath),
    completedTime: toOptionalString(raw.completedTime),
    totalSeasons: toNumber(raw.totalSeasons),
    processedSeasons: toNumber(raw.processedSeasons),
    totalEpisodes: toNumber(raw.totalEpisodes),
    processedEpisodes: toNumber(raw.processedEpisodes),
    lastError: toOptionalString(raw.lastError),
    totalPeople: toNumber(raw.totalPeople),
    syncedPeople: toNumber(raw.syncedPeople),
    failedPeople: toNumber(raw.failedPeople),
  };
};

const getLibraryTypeLabel = (libraryType: LibraryType): string => {
  switch (libraryType) {
    case LibraryType.TVShows:
      return "TV show";
    case LibraryType.Movies:
    default:
      return "Movie";
  }
};

const handleScanCompleted = (
  task: BackgroundTaskInfo,
  notify: ReturnType<typeof useNotifications>["notify"]
) => {
  const payload = parseScanOperation(task);
  const messageParts: string[] = [];

  if (payload) {
    if (payload.totalFiles > 0) {
      messageParts.push(
        `${payload.processedFiles}/${payload.totalFiles} files processed`
      );
    } else if (payload.processedFiles > 0) {
      messageParts.push(`${payload.processedFiles} files processed`);
    }

    if (payload.foundMetadata > 0) {
      messageParts.push(`${payload.foundMetadata} metadata matches`);
    }

    const peopleSummary = formatPeopleSummary(
      payload.totalPeople,
      payload.syncedPeople,
      payload.failedPeople
    );
    if (peopleSummary) {
      messageParts.push(peopleSummary);
    }
  }

  notify({
    title: "Library scan complete",
    message:
      messageParts.length > 0
        ? messageParts.join(" • ")
        : "Library scanning finished successfully.",
    type: "success",
  });
};

const handleRefreshCompleted = (
  task: BackgroundTaskInfo,
  notify: ReturnType<typeof useNotifications>["notify"]
) => {
  const payload = parseRefreshOperation(task);
  const messageParts: string[] = [];

  if (payload) {
    if (payload.totalMovies > 0) {
      messageParts.push(
        `Movies ${payload.processedMovies}/${payload.totalMovies}`
      );
    }

    if (payload.totalTvShows > 0) {
      messageParts.push(
        `TV shows ${payload.processedTvShows}/${payload.totalTvShows}`
      );
    }

    if (payload.totalItems > 0) {
      messageParts.push(
        `Items ${payload.processedItems}/${payload.totalItems}`
      );
    }

    const peopleSummary = formatPeopleSummary(
      payload.totalPeople,
      payload.syncedPeople,
      payload.failedPeople
    );
    if (peopleSummary) {
      messageParts.push(peopleSummary);
    }
  }

  notify({
    title: "Metadata refresh complete",
    message:
      messageParts.length > 0
        ? messageParts.join(" • ")
        : "Metadata refresh finished successfully.",
    type: "success",
  });
};

const handleAddToLibraryCompleted = (
  task: BackgroundTaskInfo,
  notify: ReturnType<typeof useNotifications>["notify"]
) => {
  const payload = parseAddToLibraryOperation(task);
  const title = payload?.title ?? task.name ?? "Item";
  const libraryTitle = payload?.libraryTitle ?? "Library";
  const mediaTypeLabel = getLibraryTypeLabel(
    payload?.libraryType ?? LibraryType.Movies
  );

  const detailParts: string[] = [];

  if (payload) {
    if (payload.totalSeasons > 0) {
      detailParts.push(
        `Seasons ${payload.processedSeasons ?? payload.totalSeasons}/${
          payload.totalSeasons
        }`
      );
    }

    if (payload.totalEpisodes > 0) {
      detailParts.push(
        `Episodes ${payload.processedEpisodes ?? payload.totalEpisodes}/${
          payload.totalEpisodes
        }`
      );
    }

    const peopleSummary = formatPeopleSummary(
      payload.totalPeople,
      payload.syncedPeople,
      payload.failedPeople
    );
    if (peopleSummary) {
      detailParts.push(peopleSummary);
    }
  }

  const messageParts = [`${mediaTypeLabel}: ${title}`];
  if (detailParts.length > 0) {
    messageParts.push(detailParts.join(" • "));
  }

  notify({
    title: `Added to ${libraryTitle}`,
    message: messageParts.join(" • "),
    type: "success",
  });
};

const handleTaskCompletion = (
  task: BackgroundTaskInfo,
  notify: ReturnType<typeof useNotifications>["notify"]
) => {
  switch (task.type) {
    case "MetadataScanTask":
      handleScanCompleted(task, notify);
      break;
    case "MetadataRefreshTask":
      handleRefreshCompleted(task, notify);
      break;
    case "AddToLibraryTask":
      handleAddToLibraryCompleted(task, notify);
      break;
    default:
      break;
  }
};

export default function BackgroundTaskNotifications() {
  const { tasks } = useBackgroundTasks({ enabled: true });
  const { notify } = useNotifications();
  const statusMapRef = useRef(new Map<string, BackgroundTaskStatus>());

  const handleCompletion = useCallback(
    (task: BackgroundTaskInfo) => {
      handleTaskCompletion(task, notify);
    },
    [notify]
  );

  useEffect(() => {
    const activeTaskIds = new Set(tasks.map((task) => task.id));
    for (const knownId of Array.from(statusMapRef.current.keys())) {
      if (!activeTaskIds.has(knownId)) {
        statusMapRef.current.delete(knownId);
      }
    }

    for (const task of tasks) {
      const previousStatus = statusMapRef.current.get(task.id);
      if (previousStatus === task.status) {
        continue;
      }

      statusMapRef.current.set(task.id, task.status);

      if (previousStatus === undefined) {
        continue;
      }

      if (task.status === BackgroundTaskStatus.Completed) {
        handleCompletion(task);
      }
    }
  }, [tasks, handleCompletion]);

  return null;
}
