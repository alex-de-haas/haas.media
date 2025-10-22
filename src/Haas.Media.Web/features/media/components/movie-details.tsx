"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2, Star, ArrowLeft, Film, Heart, Play, Eye } from "lucide-react";

import { useMovie, useDeleteMovieMetadata, useMoviePlaybackInfo } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { LibraryType } from "@/types/library";
import { Spinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl, getLogoUrl } from "@/lib/tmdb";
import { formatCurrency } from "@/lib/utils";
import { useNotifications } from "@/lib/notifications";
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
import { PersonCard } from "@/features/media/components/person-card";
import { ReleaseDateType } from "@/types";

interface MovieDetailsProps {
  movieId: number;
}

export default function MovieDetails({ movieId }: MovieDetailsProps) {
  const { movie, loading, error } = useMovie(movieId);
  const { files: movieFiles, loading: filesLoading } = useFilesByMediaId(movieId, LibraryType.Movies);
  const { playbackInfo, loading: playbackLoading } = useMoviePlaybackInfo(movieId);
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteMovie, loading: deletingMovie } = useDeleteMovieMetadata();

  const CREDIT_DISPLAY_LIMIT = 20;
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
        title: "Movie Deleted",
        message: `${movie.title} metadata was removed.`,
      });
      router.push("/movies");
    } else {
      notify({
        type: "error",
        title: "Delete Failed",
        message: result.message || "Unable to delete movie metadata.",
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
          <AlertTitle>Movie not found</AlertTitle>
          <AlertDescription>{error || "The movie you requested could not be found."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/movies" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Movies
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
              Back to Movies
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
                          <span className="sr-only">Open movie actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(event) => event.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Movie
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {movie.title}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The metadata for this movie will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingMovie}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deletingMovie}>
                          {deletingMovie ? "Deleting..." : "Delete"}
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
                        <span>Watched</span>
                      </Badge>
                    )}
                    {playbackInfo.totalPlayCount > 0 && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Play className="h-4 w-4 text-blue-500" />
                        <span>
                          {playbackInfo.totalPlayCount} play{playbackInfo.totalPlayCount !== 1 ? "s" : ""}
                        </span>
                      </Badge>
                    )}
                    {playbackInfo.isFavorite && (
                      <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1">
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                        <span>Favorite</span>
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
                    <h2 className="text-lg font-semibold">Overview</h2>
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
                          <span className="font-medium text-muted-foreground">Release Date</span>
                          <p>{new Date(movie.releaseDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {theatricalReleaseDate && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">Theatrical Release Date</span>
                          <p>{theatricalReleaseDate.toLocaleDateString()}</p>
                        </div>
                      )}
                      {digitalReleaseDate && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">Digital Release Date</span>
                          <p>{digitalReleaseDate.toLocaleDateString()}</p>
                        </div>
                      )}
                      {typeof movie.budget === "number" && movie.budget > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">Budget</span>
                          <p>{formatCurrency(movie.budget)}</p>
                        </div>
                      )}
                      {typeof movie.revenue === "number" && movie.revenue > 0 && (
                        <div className="space-y-1">
                          <span className="font-medium text-muted-foreground">Revenue</span>
                          <p>{formatCurrency(movie.revenue)}</p>
                        </div>
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Associated Files {filesLoading && <Spinner className="inline-block ml-2 size-3" />}
                      </span>
                      {movieFiles.length > 0 ? (
                        <div className="space-y-1">
                          {movieFiles.map((file) => (
                            <p key={file.id} className="font-mono text-xs text-muted-foreground break-all">
                              {file.filePath}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">No local files linked</p>
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
                      <CardTitle className="text-lg">Credits</CardTitle>
                      <CardDescription>Browse cast and crew details</CardDescription>
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
                            Showing {CREDIT_DISPLAY_LIMIT} of {movie.cast.length} cast members
                          </p>
                        )}
                      </div>
                    )}

                    {hasCrew && (
                      <div className="space-y-2">
                        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                          <CarouselContent className="-ml-2 sm:-ml-4">
                            {movie.crew.slice(0, CREDIT_DISPLAY_LIMIT).map((crewMember) => (
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
                            Showing {CREDIT_DISPLAY_LIMIT} of {movie.crew.length} crew members
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
    </div>
  );
}
