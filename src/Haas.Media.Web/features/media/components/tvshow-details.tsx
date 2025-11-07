"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, MoreVertical, Trash2, Tv, Star, Heart, Play, CheckCircle2, Server, HardDrive, Download, X } from "lucide-react";

import { useTVShow, useDeleteTVShowMetadata, useTVShowPlaybackInfo } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { useNodeFileDownload } from "@/features/nodes/hooks";
import { DownloadFileDialog } from "@/features/nodes/components";
import { useBackgroundTasks } from "@/features/background-tasks/hooks";
import { LibraryType } from "@/types/library";
import type { BackgroundTaskInfo } from "@/types";
import type { GlobalSettings } from "@/types/global-settings";
import { Spinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl, getLogoUrl } from "@/lib/tmdb";
import type { TVEpisodeMetadata, FileMetadata, CastMember, CrewMember } from "@/types/metadata";
import { useNotifications } from "@/lib/notifications";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
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
  onCancelDownload
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
              <div
                key={file.id}
                className="rounded-md border bg-muted/30 px-3 py-2 space-y-2 min-h-[60px] flex flex-col justify-center"
              >
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
  const [selectedFileForDownload, setSelectedFileForDownload] = useState<FileMetadata | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteTVShow, loading: deletingTVShow } = useDeleteTVShowMetadata();

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

  // Filter download tasks for this TV show
  const downloadTasks = useMemo(() => {
    return backgroundTasks.filter((task) => task.type === "node-file-download");
  }, [backgroundTasks]);

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
      ...(tvShow?.title ? { tvShowTitle: tvShow.title } : {}),
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

  const handleDownloadAllEpisodes = async (seasonNumber: number) => {
    if (!globalSettings?.tvShowDirectories || globalSettings.tvShowDirectories.length === 0) {
      notify({
        type: "error",
        title: t("downloadFailed"),
        message: t("downloadFailedNoDirectories"),
      });
      return;
    }

    // Get all remote episode files for this season
    const seasonEpisodes = tvShow?.seasons
      ?.find((s) => s.seasonNumber === seasonNumber)
      ?.episodes ?? [];
    
    const remoteEpisodeFiles = seasonEpisodes
      .flatMap((episode) => {
        const files = getEpisodeFiles(episode.seasonNumber, episode.episodeNumber);
        return files.filter((file) => file.nodeId);
      });

    if (remoteEpisodeFiles.length === 0) {
      notify({
        type: "info",
        title: t("downloadFailed"),
        message: "No remote episode files found for this season.",
      });
      return;
    }

    // Use the first TV show directory as destination
    const libraryId = globalSettings.tvShowDirectories[0];
    if (!libraryId) {
      return;
    }

    // Download all remote episode files
    let successCount = 0;
    for (const file of remoteEpisodeFiles) {
      const result = await downloadFile({
        nodeId: file.nodeId!,
        remoteFilePath: file.filePath,
        destinationDirectory: libraryId,
        ...(tvShow?.title ? { tvShowTitle: tvShow.title } : {}),
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
      }),
    });

    if (successCount > 0) {
      // Refetch files after a short delay
      setTimeout(() => {
        void refetchFiles();
      }, 1000);
    }
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

  return (
    <div>
      <div className="relative h-96 md:h-[500px] bg-gradient-to-b from-background/80 to-background">
        {backdropUrl && !imageError ? (
          <div className="relative h-full w-full">
            <Image
              src={backdropUrl}
              alt={`${tvShow.title} backdrop`}
              fill
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40">
            <Tv className="h-24 w-24 text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-6 top-6">
          <Button asChild variant="secondary" size="sm" className="bg-black/60 text-white hover:bg-black/70">
            <Link href="/tvshows" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("backToTVShows")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative z-10 -mt-32 px-4 py-8">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 lg:flex-row">
          <div className="flex-shrink-0">
            <Card className="w-64 overflow-hidden shadow-2xl">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={`${tvShow.title} poster`}
                  width={256}
                  height={384}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                <div className="flex h-96 items-center justify-center bg-muted">
                  <Tv className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </Card>
          </div>

          <div className="flex-1 space-y-6 w-full lg:max-w-4xl">
            <Card className="shadow-lg">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    {logoUrl ? (
                      <div className="mb-2">
                        <Image
                          src={logoUrl}
                          alt={`${tvShow.title} logo`}
                          width={300}
                          height={100}
                          className="max-w-[300px] h-auto object-contain"
                          priority
                        />
                      </div>
                    ) : (
                      <CardTitle className="text-3xl md:text-4xl">{tvShow.title}</CardTitle>
                    )}
                    {tvShow.originalTitle && tvShow.originalTitle !== tvShow.title && (
                      <CardDescription className="text-base">{tvShow.originalTitle}</CardDescription>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {tvShow.officialRating && (
                        <Badge variant="outline" className="font-semibold">
                          {tvShow.officialRating}
                        </Badge>
                      )}
                      {tvShow.originalLanguage && <span className="uppercase">{tvShow.originalLanguage}</span>}
                      {seasonCount > 0 && <span>{t("seasonCount", { count: seasonCount, plural: seasonCount === 1 ? "" : "s" })}</span>}
                      {totalEpisodes > 0 && <span>{t("totalEpisodes", { count: totalEpisodes })}</span>}
                    </div>
                  </div>

                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreVertical className="h-4 w-4" />
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

                {tvShow.voteAverage > 0 && (
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-foreground">{tvShow.voteAverage.toFixed(1)}</span>
                    </Badge>
                    {tvShow.voteCount > 0 && <span className="text-muted-foreground">{tvShow.voteCount.toLocaleString()} votes</span>}
                  </div>
                )}

                {/* Playback Info */}
                {!playbackLoading && playbackInfo && showPlaybackBadges && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {playbackInfo.watchedEpisodes > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{t("watchedEpisodes", { count: playbackInfo.watchedEpisodes })}</span>
                      </Badge>
                    )}
                    {playbackInfo.totalPlayCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Play className="h-4 w-4 text-blue-500" />
                        <span>{t("totalPlayCount", { count: playbackInfo.totalPlayCount })}</span>
                      </Badge>
                    )}
                    {playbackInfo.isFavorite && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        <span>{t("favorite")}</span>
                      </Badge>
                    )}
                  </div>
                )}

                {tvShow.genres && tvShow.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tvShow.genres.map((genre) => (
                      <Badge key={genre} variant="outline">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {tvShow.overview && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t("overview")}</h2>
                    <p className="text-muted-foreground leading-relaxed">{tvShow.overview}</p>
                  </div>
                )}

                {tvShow.networks?.length && (
                  <div className="space-y-4">
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
                    <Separator />
                    <p className="text-xs text-muted-foreground">Metadata last updated: {new Date(tvShow.updatedAt).toLocaleString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {(hasMergedCast || hasMergedCrew) && (
                <Card>
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
                                className="pl-2 sm:pl-4 basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
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
                                  className="pl-2 sm:pl-4 basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
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
            </div>

            <Card>
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

                      // Count remote episode files for this season
                      const remoteEpisodeCount = season.episodes?.reduce((count, episode) => {
                        const files = getEpisodeFiles(episode.seasonNumber, episode.episodeNumber);
                        return count + files.filter((file) => file.nodeId).length;
                      }, 0) ?? 0;

                      return (
                        <AccordionItem key={value} value={value} className="rounded-lg border">
                          <div className="flex items-center gap-2 px-4 py-3">
                            <AccordionTrigger className="flex-1 py-0">
                              <div className="flex flex-col gap-2 text-left w-full">
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
                            {remoteEpisodeCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 shrink-0"
                                onClick={() => void handleDownloadAllEpisodes(season.seasonNumber)}
                              >
                                <Download className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("downloadAllEpisodes")}</span> ({remoteEpisodeCount})
                              </Button>
                            )}
                          </div>
                          <AccordionContent className="space-y-4 px-4">
                            {season.overview && <p className="text-sm text-muted-foreground">{season.overview}</p>}
                            {season.directoryPath && (
                              <p className="font-mono text-xs text-muted-foreground break-all">{season.directoryPath}</p>
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
        </div>
      </div>

      <DownloadFileDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        onConfirm={handleDownloadConfirm}
        defaultFileName={selectedFileForDownload?.filePath.split("/").pop() || ""}
        mediaType={LibraryType.TVShows}
        globalSettings={globalSettings}
        isDownloading={initiatingDownloadFileId !== null}
      />
    </div>
  );
}
