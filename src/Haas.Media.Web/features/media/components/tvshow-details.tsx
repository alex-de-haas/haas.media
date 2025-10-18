"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Trash2, Tv, Star } from "lucide-react";

import { useTVShow, useDeleteTVShowMetadata } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { LibraryType } from "@/types/library";
import { Spinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl, getLogoUrl } from "@/lib/tmdb";
import type { TVEpisodeMetadata, FileMetadata } from "@/types/metadata";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PersonCard } from "@/features/media/components/person-card";

interface TVShowDetailsProps {
  tvShowId: number;
}

interface EpisodeCardProps {
  tvShowId: number;
  episode: TVEpisodeMetadata;
  episodeFiles: FileMetadata[];
}

function EpisodeCard({ tvShowId, episode, episodeFiles }: EpisodeCardProps) {
  return (
    <Link 
      href={`/tvshows/${tvShowId}/episodes/${episode.seasonNumber}/${episode.episodeNumber}`}
      className="block transition hover:scale-[1.02]"
    >
      <Card className="cursor-pointer transition hover:border-primary/60 hover:shadow-md">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">
                Episode {episode.episodeNumber}: {episode.name}
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
          {episodeFiles.length > 0 ? (
            <div className="space-y-1">
              {episodeFiles.map((file) => (
                <p key={file.id} className="font-mono text-xs text-muted-foreground break-all">
                  {file.filePath}
                </p>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground italic">No local file linked</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function TVShowDetails({ tvShowId }: TVShowDetailsProps) {
  const { tvShow, loading, error } = useTVShow(tvShowId);
  const { files: showFiles } = useFilesByMediaId(tvShowId, LibraryType.TVShows);
  const [imageError, setImageError] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<string[]>([]);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteTVShow, loading: deletingTVShow } = useDeleteTVShowMetadata();

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
    return showFiles.filter(
      (file) => file.seasonNumber === seasonNumber && file.episodeNumber === episodeNumber
    );
  };

  const handleDelete = async () => {
    if (!tvShow || deletingTVShow) {
      return;
    }

    const result = await deleteTVShow(tvShow.id);

    if (result.success) {
      notify({
        type: "success",
        title: "TV Show Deleted",
        message: `${tvShow.title} metadata was removed.`,
      });
      router.push("/tvshows");
    } else {
      notify({
        type: "error",
        title: "Delete Failed",
        message: result.message || "Unable to delete TV show metadata.",
      });
    }

    setDeleteDialogOpen(false);
  };

  const expandAllSeasons = () => {
    if (seasonValues.length === 0) {
      return;
    }
    setExpandedSeasons(seasonValues);
  };

  const collapseAllSeasons = () => {
    setExpandedSeasons([]);
  };

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
          <AlertTitle>TV show not found</AlertTitle>
          <AlertDescription>{error || "The TV show you requested could not be found."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tvshows" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to TV Shows
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
  const hasCast = Boolean(tvShow.cast && tvShow.cast.length > 0);
  const hasCrew = Boolean(tvShow.crew && tvShow.crew.length > 0);

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
              Back to TV Shows
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
                      {seasonCount > 0 && (
                        <span>
                          {seasonCount} season{seasonCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {totalEpisodes > 0 && (
                        <span>
                          {totalEpisodes} episode
                          {totalEpisodes === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>

                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open TV show actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            onSelect={(event) => event.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete TV Show
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {tvShow.title}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The metadata for this TV show will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingTVShow}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deletingTVShow}>
                          {deletingTVShow ? "Deleting..." : "Delete"}
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
                    <h2 className="text-lg font-semibold">Overview</h2>
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
                            {tvShow.cast
                              ?.slice()
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
                        {(tvShow.cast?.length ?? 0) > CREDIT_DISPLAY_LIMIT && (
                          <p className="text-xs text-muted-foreground">
                            Showing {CREDIT_DISPLAY_LIMIT} of {tvShow.cast?.length ?? 0} cast members
                          </p>
                        )}
                      </div>
                    )}

                    {hasCrew && (
                      <div className="space-y-2">
                        <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                          <CarouselContent className="-ml-2 sm:-ml-4">
                            {tvShow.crew
                              ?.slice()
                              .sort((a, b) => {
                                const importantJobs = ["Creator", "Director", "Producer", "Executive Producer", "Writer", "Screenplay"];
                                const aIndex = importantJobs.indexOf(a.job);
                                const bIndex = importantJobs.indexOf(b.job);

                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;

                                return a.name.localeCompare(b.name);
                              })
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
                        {(tvShow.crew?.length ?? 0) > CREDIT_DISPLAY_LIMIT && (
                          <p className="text-xs text-muted-foreground">
                            Showing {CREDIT_DISPLAY_LIMIT} of {tvShow.crew?.length ?? 0} crew members
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Seasons</CardTitle>
                  <CardDescription>Browse episodes and linked files</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAllSeasons}
                    disabled={seasonValues.length === 0 || expandedSeasons.length === seasonValues.length}
                  >
                    Expand all
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAllSeasons} disabled={expandedSeasons.length === 0}>
                    Collapse all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tvShow.seasons && tvShow.seasons.length > 0 ? (
                  <Accordion type="multiple" value={expandedSeasons} onValueChange={setExpandedSeasons} className="space-y-2">
                    {tvShow.seasons.map((season) => {
                      const episodeCount = season.episodes?.length || 0;
                      const value = season.seasonNumber.toString();

                      return (
                        <AccordionItem key={value} value={value} className="rounded-lg border">
                          <AccordionTrigger className="px-4 py-3">
                            <div className="flex flex-col gap-2 text-left">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-semibold">Season {season.seasonNumber}</span>
                                {season.voteAverage > 0 && (
                                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {season.voteAverage.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {episodeCount} episode
                                {episodeCount === 1 ? "" : "s"}
                              </div>
                            </div>
                          </AccordionTrigger>
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
    </div>
  );
}
