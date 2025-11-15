"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, MoreVertical, Trash2, Tv, Star, Heart, Play, CheckCircle2, Server, HardDrive, Download, X } from "lucide-react";

import { useTVShow, useDeleteTVShowMetadata, useTVShowPlaybackInfo } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { useNodeFileDownload } from "@/features/nodes/hooks";
import { DownloadFileDialog, DownloadSeasonDialog } from "@/features/nodes/components";
import { useBackgroundTasks } from "@/features/background-tasks/hooks";
import { LibraryType } from "@/types/library";
import type { BackgroundTaskInfo } from "@/types";
import type { GlobalSettings } from "@/types/global-settings";
import { BackgroundTaskStatus } from "@/types";
import { Spinner } from "@/components/ui";
import { VideoPlayerDialog } from "@/components/ui/video-player-dialog";
import { getPosterUrl, getBackdropUrl, getLogoUrl } from "@/lib/tmdb";
import { cn } from "@/lib/utils";
import type { TVEpisodeMetadata, FileMetadata, CastMember, CrewMember } from "@/types/metadata";
import { useNotifications } from "@/lib/notifications";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
import { useVideoPlayer } from "@/features/files/hooks/use-video-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PersonCard } from "@/features/media/components/person-card";

interface TVShowDetailsProps {
  tvShowId: number;
}

interface EpisodeCardProps {
  tvShowId: number;
  episode: TVEpisodeMetadata;
  episodeFiles: FileMetadata[];
  downloadTasks: BackgroundTaskInfo[];
  initiatingDownloadFileId: string | null;
  onOpenDownloadDialog: (file: FileMetadata) => void;
  onCancelDownload: (taskId: string) => Promise<void>;
}

function EpisodeCard({
  tvShowId,
  episode,
  episodeFiles,
  downloadTasks,
  initiatingDownloadFileId,
  onOpenDownloadDialog,
  onCancelDownload,
}: EpisodeCardProps) {
  const t = useTranslations("tvShows");

  return (
    <div className="space-y-2">
      <Link
        href={`/tvshows/${tvShowId}/episodes/${episode.seasonNumber}/${episode.episodeNumber}`}
        className="block transition hover:scale-[1.02]"
      >
        <Card className="cursor-pointer transition hover:border-primary/60 hover:shadow-md">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {t("episode")} {episode.episodeNumber}: {episode.name}
                </p>
              </div>
              {episode.voteAverage > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  {episode.voteAverage.toFixed(1)}
                </Badge>
              )}
            </div>
            {episode.overview && <p className="text-sm text-muted-foreground line-clamp-2">{episode.overview}</p>}
          </CardContent>
        </Card>
      </Link>

      {episodeFiles.length > 0 ? (
        <div className="space-y-2 pl-2">
          {episodeFiles.map((file) => {
            const isRemote = Boolean(file.nodeId);

            // Find active download task for this file
            const activeDownload = downloadTasks.find((task: BackgroundTaskInfo) => {
              const payload = task.payload as Record<string, unknown>;
              return (payload?.remoteFilePath as string) === file.filePath;
            });

            const isDownloading = Boolean(activeDownload || initiatingDownloadFileId === file.id);

            let downloadProgress = 0;
            let downloadedBytes = 0;
            let totalBytes = 0;

            if (activeDownload) {
              const payload = activeDownload.payload as Record<string, unknown>;
              downloadProgress = activeDownload.progress || 0;
              downloadedBytes = (payload?.downloadedBytes as number) || 0;
              totalBytes = (payload?.totalBytes as number) || 0;
            }

            return (
              <div key={file.id} className="rounded-md border bg-muted/30 px-3 py-2 space-y-2 min-h-[60px] flex flex-col justify-center">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isRemote && file.nodeName && (
                        <Badge variant="outline" className="text-xs">
                          <Server className="mr-1 h-3 w-3" />
                          {file.nodeName}
                        </Badge>
                      )}
                      {!isRemote && (
                        <Badge variant="outline" className="text-xs">
                          <HardDrive className="mr-1 h-3 w-3" />
                          {t("local")}
                        </Badge>
                      )}
                      <div className="font-mono text-xs text-muted-foreground break-all">{file.filePath}</div>
                    </div>

                    {isDownloading && activeDownload && (
                      <div className="space-y-1 pt-1">
                        <Progress value={downloadProgress} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {downloadedBytes > 0
                              ? `${(downloadedBytes / 1024 / 1024).toFixed(1)} MB / ${(totalBytes / 1024 / 1024).toFixed(1)} MB`
                              : t("preparing")}
                          </span>
                          <span>{downloadProgress.toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {isRemote && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        if (activeDownload) {
                          void onCancelDownload(activeDownload.id);
                        } else {
                          onOpenDownloadDialog(file);
                        }
                      }}
                      disabled={initiatingDownloadFileId === file.id}
                      className="shrink-0"
                      title={activeDownload ? t("cancelDownload") : t("downloadFile")}
                    >
                      {activeDownload ? (
                        <X className="h-3.5 w-3.5" />
                      ) : initiatingDownloadFileId === file.id ? (
                        <Spinner className="h-3.5 w-3.5" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="font-mono text-xs text-muted-foreground italic pl-2">{t("noLocalFile")}</p>
      )}
    </div>
  );
}

export default function TVShowDetails({ tvShowId }: TVShowDetailsProps) {
  const t = useTranslations("tvShows");
  const tCommon = useTranslations("common");
  const { tvShow, loading, error } = useTVShow(tvShowId);
  const { files: showFiles, refetch: refetchFiles } = useFilesByMediaId(tvShowId, LibraryType.TVShows);
  const { playbackInfo, loading: playbackLoading } = useTVShowPlaybackInfo(tvShowId);
  const { downloadFile } = useNodeFileDownload();
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks();
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<string[]>([]);
  const [initiatingDownloadFileId, setInitiatingDownloadFileId] = useState<string | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadSeasonDialogOpen, setDownloadSeasonDialogOpen] = useState(false);
  const [selectedFileForDownload, setSelectedFileForDownload] = useState<FileMetadata | null>(null);
  const [selectedSeasonForDownload, setSelectedSeasonForDownload] = useState<{
    seasonNumber: number;
    availableNodes: { nodeId: string; nodeName: string; count: number }[];
  } | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteTVShow, loading: deletingTVShow } = useDeleteTVShowMetadata();
  const {
    isOpen: isVideoPlayerOpen,
    setIsOpen: setVideoPlayerOpen,
    openVideo,
    videoPath,
    transcode: videoShouldTranscode,
    quality: videoQuality,
    showStreamInfo: videoShowStreamInfo,
  } = useVideoPlayer({ quality: "high", showStreamInfo: true });

  // Track previous download task IDs to detect newly completed downloads
  const previousCompletedTaskIds = useRef<Set<string>>(new Set());

  // Fetch global settings for TV show directories
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/global-settings`);
        if (response.ok) {
          const settings = await response.json();
          setGlobalSettings(settings);
        }
      } catch (error) {
        console.error("Failed to fetch global settings:", error);
      }
    };
    void fetchSettings();
  }, []);

  // Track download tasks for remote files (only active ones for progress display)
  const downloadTasks = useMemo(() => {
    return backgroundTasks.filter(
      (task: BackgroundTaskInfo) =>
        task.type === "NodeFileDownloadTask" &&
        (task.status === BackgroundTaskStatus.Pending || task.status === BackgroundTaskStatus.Running),
    );
  }, [backgroundTasks]);

  // Track all download tasks (including completed) for completion detection
  const allDownloadTasks = useMemo(() => {
    return backgroundTasks.filter((task: BackgroundTaskInfo) => task.type === "NodeFileDownloadTask");
  }, [backgroundTasks]);

  // Refresh files when download tasks complete
  useEffect(() => {
    const currentCompletedTaskIds = new Set<string>(
      allDownloadTasks
        .filter((task: BackgroundTaskInfo) => task.status === BackgroundTaskStatus.Completed)
        .map((task: BackgroundTaskInfo) => task.id),
    );

    // Find newly completed tasks (tasks that just transitioned to completed)
    const newlyCompletedTaskIds = Array.from(currentCompletedTaskIds).filter((id) => !previousCompletedTaskIds.current.has(id));

    if (newlyCompletedTaskIds.length > 0) {
      // Refetch files to show newly downloaded files
      refetchFiles();

      // Update the ref with current completed task IDs
      previousCompletedTaskIds.current = currentCompletedTaskIds;
    }
  }, [allDownloadTasks, refetchFiles]);

  useEffect(() => {
    setExpandedSeasons([]);
  }, [tvShow?.id]);

  const totalEpisodes = useMemo(() => {
    if (!tvShow?.seasons) {
      return 0;
    }

    return tvShow.seasons.reduce((total, season) => total + (season.episodes?.length || 0), 0);
  }, [tvShow?.seasons]);

  const seasonValues = useMemo(() => tvShow?.seasons?.map((season) => season.seasonNumber.toString()) ?? [], [tvShow?.seasons]);

  const primaryPlayableEpisode = useMemo(() => {
    if (!tvShow?.seasons || showFiles.length === 0) {
      return null;
    }

    const localEpisodes = showFiles
      .filter((file) => !file.nodeId && typeof file.seasonNumber === "number" && typeof file.episodeNumber === "number")
      .sort((a, b) => {
        const seasonDiff = (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0);
        if (seasonDiff !== 0) {
          return seasonDiff;
        }
        return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0);
      });

    const nextFile = localEpisodes[0];
    if (!nextFile) {
      return null;
    }

    const season = tvShow.seasons.find((s) => s.seasonNumber === nextFile.seasonNumber);
    const episode = season?.episodes?.find((ep) => ep.episodeNumber === nextFile.episodeNumber);

    return {
      file: nextFile,
      seasonNumber: nextFile.seasonNumber ?? season?.seasonNumber ?? null,
      episodeNumber: nextFile.episodeNumber ?? episode?.episodeNumber ?? null,
      episodeTitle: episode?.name ?? null,
    };
  }, [showFiles, tvShow?.seasons]);

  const heroPrimaryCtaLabel = playbackInfo?.watchedEpisodes && playbackInfo.watchedEpisodes > 0 ? t("resumeShowCta") : t("playShowCta");

  const heroCtaDescription = useMemo(() => {
    if (primaryPlayableEpisode) {
      return null;
    }

    if (showFiles.length === 0) {
      return t("playbackUnavailable");
    }

    return t("remotePlaybackUnavailable");
  }, [primaryPlayableEpisode, showFiles.length, t]);

  const heroPlayDisabled = !primaryPlayableEpisode;

  const handleHeroPlay = () => {
    if (!primaryPlayableEpisode) {
      return;
    }

    openVideo(primaryPlayableEpisode.file.filePath, tvShow?.title ?? primaryPlayableEpisode.file.filePath);
  };

  // Helper function to get files for a specific episode
  const getEpisodeFiles = (seasonNumber: number, episodeNumber: number): FileMetadata[] => {
    return showFiles.filter((file) => file.seasonNumber === seasonNumber && file.episodeNumber === episodeNumber);
  };

  const handleOpenDownloadDialog = (file: FileMetadata) => {
    if (!globalSettings?.tvShowDirectories || globalSettings.tvShowDirectories.length === 0) {
      notify({
        type: "error",
        title: t("downloadFailed"),
        message: t("downloadFailedNoDirectories"),
      });
      return;
    }

    setSelectedFileForDownload(file);
    setDownloadDialogOpen(true);
  };

  const handleDownloadConfirm = async (libraryId: string, customFileName: string) => {
    if (!selectedFileForDownload) return;

    setInitiatingDownloadFileId(selectedFileForDownload.id ?? null);
    setDownloadDialogOpen(false);

    const result = await downloadFile({
      nodeId: selectedFileForDownload.nodeId!,
      remoteFilePath: selectedFileForDownload.filePath,
      destinationDirectory: libraryId,
      ...(customFileName ? { customFileName } : {}),
      ...(tvShow?.originalTitle ? { tvShowTitle: tvShow.originalTitle } : {}),
      ...(selectedFileForDownload.seasonNumber ? { seasonNumber: selectedFileForDownload.seasonNumber } : {}),
    });

    setInitiatingDownloadFileId(null);

    notify({
      type: result.success ? "success" : "error",
      title: result.success ? t("downloadStarted") : t("downloadFailed"),
      message: result.message,
    });

    if (result.success) {
      // Refetch files after a short delay to allow the task to start
      setTimeout(() => {
        void refetchFiles();
      }, 1000);
    }

    setSelectedFileForDownload(null);
  };

  const handleCancelDownload = async (taskId: string) => {
    const result = await cancelTask(taskId);
    notify({
      type: result.success ? "success" : "error",
      title: result.success ? t("downloadCancelled") : t("cancelFailed"),
      message: result.message || "",
    });
  };

  const handleOpenDownloadSeasonDialog = (seasonNumber: number, availableNodes: { nodeId: string; nodeName: string; count: number }[]) => {
    if (!globalSettings?.tvShowDirectories || globalSettings.tvShowDirectories.length === 0) {
      notify({
        type: "error",
        title: t("downloadFailed"),
        message: t("downloadFailedNoDirectories"),
      });
      return;
    }

    setSelectedSeasonForDownload({ seasonNumber, availableNodes });
    setDownloadSeasonDialogOpen(true);
  };

  const handleDownloadSeasonConfirm = async (destinationDirectory: string, nodeId: string, nodeName: string) => {
    if (!selectedSeasonForDownload) return;

    const { seasonNumber } = selectedSeasonForDownload;

    // Get all remote episode files for this season from the specific node
    const seasonEpisodes = tvShow?.seasons?.find((s) => s.seasonNumber === seasonNumber)?.episodes ?? [];

    const remoteEpisodeFiles = seasonEpisodes.flatMap((episode) => {
      const files = getEpisodeFiles(episode.seasonNumber, episode.episodeNumber);
      return files.filter((file) => file.nodeId === nodeId);
    });

    if (remoteEpisodeFiles.length === 0) {
      notify({
        type: "info",
        title: t("downloadFailed"),
        message: "No remote episode files found for this season on this node.",
      });
      setDownloadSeasonDialogOpen(false);
      setSelectedSeasonForDownload(null);
      return;
    }

    // Download all remote episode files
    let successCount = 0;
    for (const file of remoteEpisodeFiles) {
      const result = await downloadFile({
        nodeId: file.nodeId!,
        remoteFilePath: file.filePath,
        destinationDirectory: destinationDirectory,
        ...(tvShow?.originalTitle ? { tvShowTitle: tvShow.originalTitle } : {}),
        ...(file.seasonNumber ? { seasonNumber: file.seasonNumber } : {}),
      });

      if (result.success) {
        successCount++;
      }
    }

    notify({
      type: successCount > 0 ? "success" : "error",
      title: successCount > 0 ? t("seasonDownloadStarted") : t("downloadFailed"),
      message: t("seasonDownloadStartedMessage", {
        count: successCount,
        plural: successCount !== 1 ? "s" : "",
        season: seasonNumber,
        nodeName: nodeName,
      }),
    });

    if (successCount > 0) {
      // Refetch files after a short delay
      setTimeout(() => {
        void refetchFiles();
      }, 1000);
    }

    // Close the dialog and reset state
    setDownloadSeasonDialogOpen(false);
    setSelectedSeasonForDownload(null);
  };

  const handleDelete = async () => {
    if (!tvShow || deletingTVShow) {
      return;
    }

    const result = await deleteTVShow(tvShow.id);

    if (result.success) {
      notify({
        type: "success",
        title: t("showDeleted"),
        message: t("showDeletedMessage", { title: tvShow.title }),
      });
      router.push("/tvshows");
    } else {
      notify({
        type: "error",
        title: t("deleteFailed"),
        message: result.message || t("deleteFailedMessage"),
      });
    }

    setDeleteDialogOpen(false);
  };

  const showPlaybackBadges = useMemo(() => {
    if (!playbackInfo) {
      return false;
    }

    return playbackInfo.watchedEpisodes > 0 || playbackInfo.totalPlayCount > 0 || playbackInfo.isFavorite;
  }, [playbackInfo]);

  const expandAllSeasons = () => {
    if (seasonValues.length === 0) {
      return;
    }
    setExpandedSeasons(seasonValues);
  };

  const collapseAllSeasons = () => {
    setExpandedSeasons([]);
  };

  // Merge show credits with episode cast and crew
  const mergedCredits = useMemo(() => {
    const castMap = new Map<
      number,
      {
        person: CastMember;
        isMainCast: boolean;
        order: number;
        character?: string;
        episodeAppearances?: number;
      }
    >();
    const crewMap = new Map<
      number,
      {
        person: CrewMember;
        isMainCrew: boolean;
        weight: number;
        job: string;
        department?: string;
        episodeAppearances?: number;
      }
    >();

    // Add main show cast
    tvShow?.cast?.forEach((castMember) => {
      castMap.set(castMember.id, {
        person: castMember,
        isMainCast: true,
        order: castMember.order,
        character: castMember.character,
      });
    });

    // Add main show crew
    tvShow?.crew?.forEach((crewMember) => {
      crewMap.set(crewMember.id, {
        person: crewMember,
        isMainCrew: true,
        weight: crewMember.weight,
        job: crewMember.job,
        department: crewMember.department,
      });
    });

    // Add episode cast and crew
    tvShow?.seasons?.forEach((season) => {
      season.episodes?.forEach((episode) => {
        // Aggregate episode cast
        episode.cast?.forEach((castMember) => {
          const existing = castMap.get(castMember.id);
          if (existing) {
            // Update episode appearances count if not main cast
            if (!existing.isMainCast) {
              existing.episodeAppearances = (existing.episodeAppearances || 0) + 1;
            }
            // Keep the best order (lowest number)
            if (castMember.order < existing.order) {
              existing.order = castMember.order;
              existing.character = castMember.character;
            }
          } else {
            // Add as guest star
            castMap.set(castMember.id, {
              person: castMember,
              isMainCast: false,
              order: castMember.order,
              character: castMember.character,
              episodeAppearances: 1,
            });
          }
        });

        // Aggregate episode crew
        episode.crew?.forEach((crewMember) => {
          const existing = crewMap.get(crewMember.id);
          if (existing) {
            // Update episode appearances count if not main crew
            if (!existing.isMainCrew) {
              existing.episodeAppearances = (existing.episodeAppearances || 0) + 1;
            }
            // Keep the highest weight
            if (crewMember.weight > existing.weight) {
              existing.weight = crewMember.weight;
              existing.job = crewMember.job;
              existing.department = crewMember.department;
            }
          } else {
            // Add as episode crew
            crewMap.set(crewMember.id, {
              person: crewMember,
              isMainCrew: false,
              weight: crewMember.weight,
              job: crewMember.job,
              department: crewMember.department,
              episodeAppearances: 1,
            });
          }
        });
      });
    });

    // Convert to arrays and sort
    const cast = Array.from(castMap.values()).sort((a, b) => a.order - b.order);

    const crew = Array.from(crewMap.values()).sort((a, b) => b.weight - a.weight);

    return { cast, crew };
  }, [tvShow?.cast, tvShow?.crew, tvShow?.seasons]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !tvShow) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>{t("tvShowNotFound")}</AlertTitle>
          <AlertDescription>{error || t("tvShowNotFoundDescription")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tvshows" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> {t("backToTVShows")}
          </Link>
        </Button>
      </div>
    );
  }

  const posterUrl = getPosterUrl(tvShow.posterPath);
  const backdropUrl = getBackdropUrl(tvShow.backdropPath);
  const logoUrl = getLogoUrl(tvShow.logoPath, "w500");
  const seasonCount = tvShow.seasons?.length ?? 0;
  const CREDIT_DISPLAY_LIMIT = 20;
  const hasMergedCast = mergedCredits.cast.length > 0;
  const hasMergedCrew = mergedCredits.crew.length > 0;
  const heroEpisodeLabel =
    primaryPlayableEpisode?.seasonNumber != null && primaryPlayableEpisode?.episodeNumber != null
      ? t("heroEpisodeLabel", {
          season: primaryPlayableEpisode.seasonNumber,
          episode: primaryPlayableEpisode.episodeNumber,
        })
      : null;
  const heroEpisodeTitle = primaryPlayableEpisode?.episodeTitle ?? null;
  const formattedFirstAirDate = tvShow.firstAirDate ? new Date(tvShow.firstAirDate).toLocaleDateString() : null;
  const metadataUpdatedAt = new Date(tvShow.updatedAt).toLocaleString();

  return (
    <div className="flex flex-col gap-8 pb-16">
      <section className="relative isolate min-h-[560px] w-full overflow-hidden rounded-b-[36px] border border-border/30 bg-background">
        {backdropUrl && !imageError ? (
          <Image
            src={backdropUrl}
            alt={`${tvShow.title} backdrop`}
            fill
            className="object-cover"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40">
            <Tv className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-background dark:from-black/80 dark:via-black/70 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 pb-12 pt-8 lg:gap-12">
          <div className="flex items-center justify-between text-white">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
            >
              <Link href="/tvshows" className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("backToTVShows")}
              </Link>
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/30 bg-white/10 text-white hover:bg-white/20"
                  >
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">{t("openShowActions")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(event) => event.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("deleteShow")}
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteShowConfirm", { title: tvShow.title })}</AlertDialogTitle>
                  <AlertDialogDescription>{t("deleteShowDescription")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deletingTVShow}>{tCommon("cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deletingTVShow}>
                    {deletingTVShow ? t("deleting") : tCommon("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
            <div className="order-2 flex flex-1 flex-col gap-5 text-white lg:order-1">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={`${tvShow.title} logo`}
                  width={360}
                  height={140}
                  className="max-w-[360px] object-contain drop-shadow-[0_15px_45px_rgba(0,0,0,0.45)]"
                  priority
                />
              ) : (
                <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{tvShow.title}</h1>
              )}

              {tvShow.originalTitle && tvShow.originalTitle !== tvShow.title && (
                <p className="text-base text-white/70">{tvShow.originalTitle}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                {formattedFirstAirDate && <span>{formattedFirstAirDate}</span>}
                {tvShow.status && <span>{tvShow.status}</span>}
                {tvShow.officialRating && (
                  <span className="rounded-full border border-white/40 px-2 py-0.5 text-xs font-semibold uppercase">
                    {tvShow.officialRating}
                  </span>
                )}
                {tvShow.originalLanguage && <span className="uppercase">{tvShow.originalLanguage}</span>}
                {seasonCount > 0 && <span>{t("seasonCount", { count: seasonCount, plural: seasonCount === 1 ? "" : "s" })}</span>}
                {totalEpisodes > 0 && <span>{t("totalEpisodes", { count: totalEpisodes })}</span>}
                {tvShow.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {tvShow.voteAverage.toFixed(1)}
                  </span>
                )}
                {tvShow.voteCount > 0 && <span>{t("voteCount", { count: tvShow.voteCount })}</span>}
              </div>

              {tvShow.genres && tvShow.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tvShow.genres.slice(0, 6).map((genre) => (
                    <Badge key={genre} className="bg-white/15 text-white hover:bg-white/20">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {tvShow.overview && <p className="max-w-3xl text-base text-white/80 md:text-lg">{tvShow.overview}</p>}

              {!playbackLoading && playbackInfo && showPlaybackBadges && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {playbackInfo.watchedEpisodes > 0 && (
                    <Badge className="bg-white/15 text-white hover:bg-white/20">
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {t("watchedEpisodes", { count: playbackInfo.watchedEpisodes })}
                    </Badge>
                  )}
                  {playbackInfo.totalPlayCount > 0 && (
                    <Badge className="bg-white/15 text-white hover:bg-white/20">
                      <Play className="mr-1 h-4 w-4" />
                      {t("totalPlayCount", { count: playbackInfo.totalPlayCount })}
                    </Badge>
                  )}
                  {playbackInfo.isFavorite && (
                    <Badge className="bg-white/15 text-white hover:bg-white/20">
                      <Heart className="mr-1 h-4 w-4 fill-red-400 text-red-400" />
                      {t("favorite")}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleHeroPlay}
                  disabled={heroPlayDisabled}
                  className={cn(
                    "h-14 rounded-full px-8 text-base font-semibold shadow-2xl shadow-primary/40",
                    heroPlayDisabled ? "bg-white/20 text-white/70" : "bg-white text-black hover:bg-white/90",
                  )}
                >
                  <Play className="h-5 w-5" />
                  <span className="ml-2">{heroPrimaryCtaLabel}</span>
                </Button>
              </div>

              {heroCtaDescription && <p className="text-sm text-white/80">{heroCtaDescription}</p>}
              {primaryPlayableEpisode && (
                <div className="space-y-1 text-sm text-white/80">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/60">{t("nextEpisodeHint")}</p>
                  {heroEpisodeLabel && <p className="font-semibold text-white">{heroEpisodeLabel}</p>}
                  {heroEpisodeTitle && <p className="text-white/80">{heroEpisodeTitle}</p>}
                  <p className="text-xs text-white/70">{primaryPlayableEpisode.file.filePath}</p>
                </div>
              )}

              {tvShow.networks && tvShow.networks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tvShow.networks.map((network, index) => (
                    <Badge key={`${network.id}-${index}`} className="bg-white/10 text-white">
                      {network.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="order-1 flex justify-center lg:order-2">
              <div className="relative w-full max-w-[260px] sm:max-w-[320px]">
                <div className="rounded-[32px] border border-white/20 bg-white/5 p-1 shadow-2xl shadow-black/40 backdrop-blur">
                  {posterUrl ? (
                    <Image
                      src={posterUrl}
                      alt={`${tvShow.title} poster`}
                      width={320}
                      height={480}
                      className="aspect-[2/3] w-full rounded-[28px] object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex aspect-[2/3] items-center justify-center rounded-[28px] bg-black/30">
                      <Tv className="h-16 w-16 text-white/40" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="-mt-10 px-4">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6">
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <div>
                <CardTitle className="text-xl">{t("overview")}</CardTitle>
                <CardDescription>{t("showDetails")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {tvShow.overview && <p className="text-base leading-relaxed text-muted-foreground">{tvShow.overview}</p>}

              <div className="grid gap-4 text-sm sm:grid-cols-2">
                {formattedFirstAirDate && (
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">{t("firstAired")}</span>
                    <p>{formattedFirstAirDate}</p>
                  </div>
                )}
                {tvShow.status && (
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">{t("status")}</span>
                    <p>{tvShow.status}</p>
                  </div>
                )}
                {tvShow.officialRating && (
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">{t("rating")}</span>
                    <p>{tvShow.officialRating}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="font-medium text-muted-foreground">Metadata</span>
                  <p>{metadataUpdatedAt}</p>
                </div>
              </div>

              {tvShow.networks && tvShow.networks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Networks</h3>
                  <div className="flex flex-wrap gap-2">
                    {tvShow.networks.map((network, index) => (
                      <Badge key={`${network.id}-${index}`} variant="outline">
                        {network.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {(hasMergedCast || hasMergedCrew) && (
            <Card className="border-border/60 shadow-lg">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-lg">{t("credits")}</CardTitle>
                  <CardDescription>{t("creditsDescription")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {hasMergedCast && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">{t("cast")}</h3>
                    <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {mergedCredits.cast.slice(0, CREDIT_DISPLAY_LIMIT).map((item) => (
                          <CarouselItem
                            key={`cast-${item.person.id}`}
                            className="basis-3/4 pl-2 sm:basis-1/2 sm:pl-4 md:basis-1/3 lg:basis-1/4"
                          >
                            <PersonCard
                              name={item.person.name}
                              {...(item.character ? { description: item.character } : {})}
                              {...(item.episodeAppearances
                                ? { meta: `${item.episodeAppearances} episode${item.episodeAppearances > 1 ? "s" : ""}` }
                                : item.isMainCast
                                  ? { meta: "Main cast" }
                                  : {})}
                              profilePath={item.person.profilePath ?? null}
                              href={`/people/${item.person.id}`}
                              className="mx-auto h-full"
                            />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="hidden md:flex -left-8" />
                      <CarouselNext className="hidden md:flex -right-8" />
                    </Carousel>
                    {mergedCredits.cast.length > CREDIT_DISPLAY_LIMIT && (
                      <p className="text-xs text-muted-foreground">
                        {t("showingCastMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: mergedCredits.cast.length })}
                      </p>
                    )}
                  </div>
                )}

                {hasMergedCrew && (
                  <>
                    {hasMergedCast && <Separator />}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">{t("crew")}</h3>
                      <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                        <CarouselContent className="-ml-2 sm:-ml-4">
                          {mergedCredits.crew.slice(0, CREDIT_DISPLAY_LIMIT).map((item) => (
                            <CarouselItem
                              key={`crew-${item.person.id}-${item.job}`}
                              className="basis-3/4 pl-2 sm:basis-1/2 sm:pl-4 md:basis-1/3 lg:basis-1/4"
                            >
                              <PersonCard
                                name={item.person.name}
                                description={item.job}
                                {...(item.episodeAppearances
                                  ? { meta: `${item.episodeAppearances} episode${item.episodeAppearances > 1 ? "s" : ""}` }
                                  : item.department
                                    ? { meta: item.department }
                                    : {})}
                                profilePath={item.person.profilePath ?? null}
                                href={`/people/${item.person.id}`}
                                className="mx-auto h-full"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="hidden md:flex -left-8" />
                        <CarouselNext className="hidden md:flex -right-8" />
                      </Carousel>
                      {mergedCredits.crew.length > CREDIT_DISPLAY_LIMIT && (
                        <p className="text-xs text-muted-foreground">
                          {t("showingCrewMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: mergedCredits.crew.length })}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{t("seasons")}</CardTitle>
                <CardDescription>Browse episodes and linked files</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={expandAllSeasons}
                  disabled={seasonValues.length === 0 || expandedSeasons.length === seasonValues.length}
                >
                  {t("expandAll")}
                </Button>
                <Button variant="ghost" size="sm" onClick={collapseAllSeasons} disabled={expandedSeasons.length === 0}>
                  {t("collapseAll")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tvShow.seasons && tvShow.seasons.length > 0 ? (
                <Accordion type="multiple" value={expandedSeasons} onValueChange={setExpandedSeasons} className="space-y-2">
                  {tvShow.seasons.map((season) => {
                    const episodeCount = season.episodes?.length || 0;
                    const value = season.seasonNumber.toString();

                    const nodeEpisodeMap = new Map<string, { nodeId: string; nodeName: string; count: number }>();

                    season.episodes?.forEach((episode) => {
                      const files = getEpisodeFiles(episode.seasonNumber, episode.episodeNumber);
                      files
                        .filter((file) => file.nodeId)
                        .forEach((file) => {
                          const key = file.nodeId!;
                          const existing = nodeEpisodeMap.get(key);
                          if (existing) {
                            existing.count++;
                          } else {
                            nodeEpisodeMap.set(key, {
                              nodeId: file.nodeId!,
                              nodeName: file.nodeName || "Unknown Node",
                              count: 1,
                            });
                          }
                        });
                    });

                    const nodeDownloads = Array.from(nodeEpisodeMap.values());

                    return (
                      <AccordionItem key={value} value={value} className="rounded-lg border">
                        <div className="flex items-center gap-2 px-4 py-3">
                          <AccordionTrigger className="flex-1 py-0">
                            <div className="flex w-full flex-col gap-2 text-left">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-semibold">{t("seasonNumber", { number: season.seasonNumber })}</span>
                                {season.voteAverage > 0 && (
                                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {season.voteAverage.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{t("episodeCount", { count: episodeCount })}</div>
                            </div>
                          </AccordionTrigger>
                          {nodeDownloads.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-2"
                              onClick={() => handleOpenDownloadSeasonDialog(season.seasonNumber, nodeDownloads)}
                              title="Download all episodes from this season"
                            >
                              <Download className="h-4 w-4" />
                              <span className="hidden sm:inline">{t("downloadSeason")}</span>
                              <Badge variant="secondary" className="ml-1">
                                {nodeDownloads.length}
                              </Badge>
                            </Button>
                          )}
                        </div>
                        <AccordionContent className="space-y-4 px-4">
                          {season.overview && <p className="text-sm text-muted-foreground">{season.overview}</p>}
                          {season.directoryPath && (
                            <p className="break-all font-mono text-xs text-muted-foreground">{season.directoryPath}</p>
                          )}
                          {episodeCount > 0 ? (
                            <div className="space-y-3">
                              {season.episodes.map((episode) => (
                                <EpisodeCard
                                  key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                                  tvShowId={tvShowId}
                                  episode={episode}
                                  episodeFiles={getEpisodeFiles(episode.seasonNumber, episode.episodeNumber)}
                                  downloadTasks={downloadTasks}
                                  initiatingDownloadFileId={initiatingDownloadFileId}
                                  onOpenDownloadDialog={handleOpenDownloadDialog}
                                  onCancelDownload={handleCancelDownload}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm italic text-muted-foreground">No episodes found for this season.</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <p className="text-sm text-muted-foreground">No seasons metadata available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <VideoPlayerDialog
        open={isVideoPlayerOpen}
        onOpenChange={setVideoPlayerOpen}
        videoPath={videoPath}
        title={tvShow.title}
        transcode={videoShouldTranscode ?? false}
        quality={videoQuality ?? "medium"}
        showStreamInfo={videoShowStreamInfo ?? false}
        className="rounded-2xl"
      />

      <DownloadFileDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        onConfirm={handleDownloadConfirm}
        defaultFileName={selectedFileForDownload?.filePath.split("/").pop() || ""}
        mediaType={LibraryType.TVShows}
        globalSettings={globalSettings}
        isDownloading={initiatingDownloadFileId !== null}
      />

      <DownloadSeasonDialog
        open={downloadSeasonDialogOpen}
        onOpenChange={setDownloadSeasonDialogOpen}
        onConfirm={handleDownloadSeasonConfirm}
        seasonNumber={selectedSeasonForDownload?.seasonNumber || 0}
        availableNodes={selectedSeasonForDownload?.availableNodes || []}
        globalSettings={globalSettings}
        isDownloading={false}
      />
    </div>
  );
}
