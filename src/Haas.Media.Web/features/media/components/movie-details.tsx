"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MoreVertical, Trash2, Star, ArrowLeft, Film, Heart, Play, Eye, Download, Server, X, HardDrive } from "lucide-react";

import { useMovie, useDeleteMovieMetadata, useMoviePlaybackInfo } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { useNodeFileDownload } from "@/features/nodes/hooks";
import { DownloadFileDialog } from "@/features/nodes/components";
import { useBackgroundTasks } from "@/features/background-tasks/hooks";
import { LibraryType } from "@/types/library";
import type { BackgroundTaskInfo } from "@/types";
import type { GlobalSettings } from "@/types/global-settings";
import type { FileMetadata } from "@/types/metadata";
import { Spinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl, getLogoUrl } from "@/lib/tmdb";
import { formatCurrency } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications";
import { downloaderApi } from "@/lib/api";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { Progress } from "@/components/ui/progress";
import { PersonCard } from "@/features/media/components/person-card";
import { ReleaseDateType, BackgroundTaskStatus } from "@/types";

interface MovieDetailsProps {
  movieId: number;
}

export default function MovieDetails({ movieId }: MovieDetailsProps) {
  const t = useTranslations("movies");
  const tCommon = useTranslations("common");
  const { movie, loading, error } = useMovie(movieId);
  const { files: movieFiles, loading: filesLoading, refetch: refetchFiles } = useFilesByMediaId(movieId, LibraryType.Movies);
  const { playbackInfo, loading: playbackLoading } = useMoviePlaybackInfo(movieId);
  const { downloadFile } = useNodeFileDownload();
  const { tasks: backgroundTasks, cancelTask } = useBackgroundTasks();
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [initiatingDownloadFileId, setInitiatingDownloadFileId] = useState<string | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [selectedFileForDownload, setSelectedFileForDownload] = useState<FileMetadata | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteMovie, loading: deletingMovie } = useDeleteMovieMetadata();

  // Track previous download task IDs to detect newly completed downloads
  const previousCompletedTaskIds = useRef<Set<string>>(new Set());

  const CREDIT_DISPLAY_LIMIT = 20;

  // Fetch global settings for movie directories
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
    fetchSettings();
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

  const handleCancelDownload = async (taskId: string) => {
    const result = await cancelTask(taskId);
    if (result.success) {
      notify({
        type: "success",
        title: t("downloadCancelled"),
        message: t("downloadCancelledMessage"),
      });
    } else {
      notify({
        type: "error",
        title: t("cancellationFailed"),
        message: result.message || t("cancellationFailedMessage"),
      });
    }
  };

  const handleOpenDownloadDialog = (file: FileMetadata) => {
    if (!globalSettings?.movieDirectories || globalSettings.movieDirectories.length === 0) {
      notify({
        type: "error",
        title: t("deleteFailed"),
        message: t("downloadFailedNoDirectories"),
      });
      return;
    }

    setSelectedFileForDownload(file);
    setDownloadDialogOpen(true);
  };

  const handleConfirmDownload = async (destinationDirectory: string, fileName: string) => {
    if (!selectedFileForDownload || !selectedFileForDownload.nodeId) {
      return;
    }

    setInitiatingDownloadFileId(selectedFileForDownload.id!);
    try {
      const result = await downloadFile({
        nodeId: selectedFileForDownload.nodeId,
        remoteFilePath: selectedFileForDownload.filePath,
        destinationDirectory,
        customFileName: fileName,
      });

      if (result.success && result.taskId) {
        notify({
          type: "success",
          title: t("downloadStarted"),
          message: t("downloadStartedMessage"),
        });
        setDownloadDialogOpen(false);
        setSelectedFileForDownload(null);
      } else {
        notify({
          type: "error",
          title: t("deleteFailed"),
          message: result.message,
        });
      }
    } catch (error) {
      notify({
        type: "error",
        title: t("deleteFailed"),
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    } finally {
      setInitiatingDownloadFileId(null);
    }
  };

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

  const showPlaybackBadges = useMemo(() => {
    if (!playbackInfo) {
      return false;
    }

    return playbackInfo.anyPlayed || playbackInfo.totalPlayCount > 0 || playbackInfo.isFavorite;
  }, [playbackInfo]);
  const releaseYear = useMemo(() => {
    if (!movie?.releaseDate) {
      return null;
    }

    return new Date(movie.releaseDate).getFullYear();
  }, [movie?.releaseDate]);

  const theatricalReleaseDate = useMemo(() => {
    if (!movie?.releaseDates) {
      return null;
    }

    const theatrical = movie.releaseDates.find(
      (rd) => rd.type === ReleaseDateType.Theatrical || rd.type === ReleaseDateType.TheatricalLimited,
    );

    if (!theatrical) {
      return null;
    }

    const parsedDate = new Date(theatrical.date);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }, [movie?.releaseDates]);

  const digitalReleaseDate = useMemo(() => {
    if (!movie?.releaseDates) {
      return null;
    }

    const digital = movie.releaseDates.find((rd) => rd.type === ReleaseDateType.Digital);

    if (!digital) {
      return null;
    }

    const parsedDate = new Date(digital.date);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }, [movie?.releaseDates]);

  const handleDelete = async () => {
    if (!movie || deletingMovie) {
      return;
    }

    const result = await deleteMovie(movie.id);

    if (result.success) {
      notify({
        type: "success",
        title: t("movieDeleted"),
        message: t("movieDeletedMessage", { title: movie.title }),
      });
      router.push("/movies");
    } else {
      notify({
        type: "error",
        title: t("deleteFailed"),
        message: result.message || t("deleteFailedMessage"),
      });
    }

    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>{t("movieNotFound")}</AlertTitle>
          <AlertDescription>{error || t("movieNotFoundDescription")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/movies" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> {t("backToMovies")}
          </Link>
        </Button>
      </div>
    );
  }

  const posterUrl = getPosterUrl(movie.posterPath);
  const backdropUrl = getBackdropUrl(movie.backdropPath);
  const logoUrl = getLogoUrl(movie.logoPath, "w500");
  const hasCast = Boolean(movie.cast && movie.cast.length > 0);
  const hasCrew = Boolean(movie.crew && movie.crew.length > 0);

  return (
    <div>
      <div className="relative h-96 md:h-[500px] bg-gradient-to-b from-background/80 to-background">
        {backdropUrl && !imageError ? (
          <div className="relative h-full w-full">
            <Image
              src={backdropUrl}
              alt={`${movie.title} backdrop`}
              fill
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40">
            <Film className="h-24 w-24 text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-6 top-6">
          <Button asChild variant="secondary" size="sm" className="bg-black/60 text-white hover:bg-black/70">
            <Link href="/movies" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("backToMovies")}
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
                  alt={`${movie.title} poster`}
                  width={256}
                  height={384}
                  className="h-full w-full object-cover"
                  priority
                />
              ) : (
                <div className="flex h-96 items-center justify-center bg-muted">
                  <Film className="h-16 w-16 text-muted-foreground" />
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
                          alt={`${movie.title} logo`}
                          width={300}
                          height={100}
                          className="max-w-[300px] h-auto object-contain"
                          priority
                        />
                      </div>
                    ) : (
                      <CardTitle className="text-3xl md:text-4xl">{movie.title}</CardTitle>
                    )}
                    {movie.originalTitle && movie.originalTitle !== movie.title && (
                      <CardDescription className="text-base">{movie.originalTitle}</CardDescription>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {releaseYear && <span>{releaseYear}</span>}
                      {movie.officialRating && (
                        <Badge variant="outline" className="font-semibold">
                          {movie.officialRating}
                        </Badge>
                      )}
                      {movie.originalLanguage && <span className="uppercase">{movie.originalLanguage}</span>}
                    </div>
                  </div>

                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">{t("openMovieActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(event) => event.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("deleteMovie")}
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("deleteMovieConfirm", { title: movie.title })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("deleteMovieDescription")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingMovie}>{tCommon("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deletingMovie}>
                          {deletingMovie ? t("deleting") : tCommon("delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {movie.voteAverage > 0 && (
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-semibold text-foreground">{movie.voteAverage.toFixed(1)}</span>
                    </Badge>
                    {movie.voteCount > 0 && <span className="text-muted-foreground">{movie.voteCount.toLocaleString()} votes</span>}
                  </div>
                )}

                {/* Playback Info */}
                {!playbackLoading && playbackInfo && showPlaybackBadges && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {playbackInfo.anyPlayed && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Eye className="h-4 w-4 text-green-500" />
                        <span>{t("watched")}</span>
                      </Badge>
                    )}
                    {playbackInfo.totalPlayCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Play className="h-4 w-4 text-blue-500" />
                        <span>
                          {playbackInfo.totalPlayCount === 1 ? t("play", { count: 1 }) : t("plays", { count: playbackInfo.totalPlayCount })}
                        </span>
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

                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre) => (
                      <Badge key={genre} variant="outline">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {movie.overview && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{t("overview")}</h2>
                    <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
                  </div>
                )}

                {(movie.releaseDate ||
                  theatricalReleaseDate ||
                  digitalReleaseDate ||
                  movie.budget ||
                  movie.revenue ||
                  movieFiles.length > 0) && (
                  <div className="space-y-4">
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      {movie.releaseDate && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">{t("releaseDate")}</span>
                          <p>{new Date(movie.releaseDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {theatricalReleaseDate && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">{t("theatricalReleaseDate")}</span>
                          <p>{theatricalReleaseDate.toLocaleDateString()}</p>
                        </div>
                      )}
                      {digitalReleaseDate && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">{t("digitalReleaseDate")}</span>
                          <p>{digitalReleaseDate.toLocaleDateString()}</p>
                        </div>
                      )}
                      {typeof movie.budget === "number" && movie.budget > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">{t("budget")}</span>
                          <p>{formatCurrency(movie.budget)}</p>
                        </div>
                      )}
                      {typeof movie.revenue === "number" && movie.revenue > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">{t("revenue")}</span>
                          <p>{formatCurrency(movie.revenue)}</p>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {t("associatedFiles")} {filesLoading && <Spinner className="inline-block ml-2 size-3" />}
                        </span>
                      </div>

                      {movieFiles.length > 0 ? (
                        <div className="space-y-2">
                          {movieFiles.map((file) => {
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
                                      onClick={() => {
                                        if (activeDownload) {
                                          void handleCancelDownload(activeDownload.id);
                                        } else {
                                          handleOpenDownloadDialog(file);
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
                        <p className="text-xs italic text-muted-foreground">{t("noFilesLinked")}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {(hasCast || hasCrew) && (
                <Card>
                  <CardHeader className="space-y-4">
                    <div>
                      <CardTitle className="text-lg">{t("credits")}</CardTitle>
                      <CardDescription>{t("creditsDescription")}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {hasCast && (
                      <div className="space-y-2">
                        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                          <CarouselContent className="-ml-2 sm:-ml-4">
                            {movie.cast
                              .slice()
                              .sort((a, b) => a.order - b.order)
                              .slice(0, CREDIT_DISPLAY_LIMIT)
                              .map((castMember) => (
                                <CarouselItem
                                  key={`${castMember.id}-${castMember.order}`}
                                  className="pl-2 sm:pl-4 basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                                >
                                  <PersonCard
                                    name={castMember.name}
                                    {...(castMember.character ? { description: castMember.character } : {})}
                                    profilePath={castMember.profilePath ?? null}
                                    href={`/people/${castMember.id}`}
                                    className="mx-auto h-full"
                                  />
                                </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious className="hidden md:flex -left-8" />
                          <CarouselNext className="hidden md:flex -right-8" />
                        </Carousel>
                        {movie.cast.length > CREDIT_DISPLAY_LIMIT && (
                          <p className="text-xs text-muted-foreground">
                            {t("showingCastMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: movie.cast.length })}
                          </p>
                        )}
                      </div>
                    )}

                    {hasCrew && (
                      <div className="space-y-2">
                        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                          <CarouselContent className="-ml-2 sm:-ml-4">
                            {movie.crew
                              .slice()
                              .sort((a, b) => b.weight - a.weight)
                              .slice(0, CREDIT_DISPLAY_LIMIT)
                              .map((crewMember) => (
                                <CarouselItem
                                  key={`${crewMember.id}-${crewMember.job}`}
                                  className="pl-2 sm:pl-4 basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                                >
                                  <PersonCard
                                    name={crewMember.name}
                                    description={crewMember.job}
                                    {...(crewMember.department ? { meta: crewMember.department } : {})}
                                    profilePath={crewMember.profilePath ?? null}
                                    href={`/people/${crewMember.id}`}
                                    className="mx-auto h-full"
                                  />
                                </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious className="hidden md:flex -left-8" />
                          <CarouselNext className="hidden md:flex -right-8" />
                        </Carousel>
                        {movie.crew.length > CREDIT_DISPLAY_LIMIT && (
                          <p className="text-xs text-muted-foreground">
                            {t("showingCrewMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: movie.crew.length })}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <DownloadFileDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        onConfirm={handleConfirmDownload}
        defaultFileName={selectedFileForDownload ? selectedFileForDownload.filePath.split("/").pop() || "" : ""}
        mediaType={LibraryType.Movies}
        globalSettings={globalSettings}
        isDownloading={initiatingDownloadFileId !== null}
      />
    </div>
  );
}
