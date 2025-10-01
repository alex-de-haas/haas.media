"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Trash2, Tv, Star } from "lucide-react";

import { useTVShow, useDeleteTVShowMetadata } from "@/features/media/hooks";
import { LoadingSpinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import type {
  TVSeasonMetadata,
  TVEpisodeMetadata,
  CrewMember,
  CastMember,
} from "@/types/metadata";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TVShowDetailsProps {
  tvShowId: string;
}

interface CrewMemberCardProps {
  crewMember: CrewMember;
}

interface CastMemberCardProps {
  castMember: CastMember;
}

interface EpisodeCardProps {
  episode: TVEpisodeMetadata;
}

function getInitials(name?: string) {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);
  const [first = "", second = ""] = parts;
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

function CastMemberCard({ castMember }: CastMemberCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="h-12 w-12">
          {castMember.profilePath ? (
            <AvatarImage
              src={`https://image.tmdb.org/t/p/w92${castMember.profilePath}`}
              alt={castMember.name}
            />
          ) : (
            <AvatarFallback>{getInitials(castMember.name)}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{castMember.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            as {castMember.character}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CrewMemberCard({ crewMember }: CrewMemberCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="h-12 w-12">
          {crewMember.profilePath ? (
            <AvatarImage
              src={`https://image.tmdb.org/t/p/w92${crewMember.profilePath}`}
              alt={crewMember.name}
            />
          ) : (
            <AvatarFallback>{getInitials(crewMember.name)}</AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{crewMember.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {crewMember.job}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {crewMember.department}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Card>
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
        {episode.overview && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {episode.overview}
          </p>
        )}
        <p className="font-mono text-xs text-muted-foreground break-all">
          {episode.filePath || "No local file linked"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function TVShowDetails({ tvShowId }: TVShowDetailsProps) {
  const { tvShow, loading, error } = useTVShow(tvShowId);
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

    return tvShow.seasons.reduce(
      (total, season) => total + (season.episodes?.length || 0),
      0
    );
  }, [tvShow?.seasons]);

  const seasonValues = useMemo(
    () => tvShow?.seasons?.map((season) => season.seasonNumber.toString()) ?? [],
    [tvShow?.seasons]
  );

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
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tvShow) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>TV show not found</AlertTitle>
          <AlertDescription>
            {error || "The TV show you requested could not be found."}
          </AlertDescription>
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
  const seasonCount = tvShow.seasons?.length ?? 0;

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
          <Button
            asChild
            variant="secondary"
            size="sm"
            className="bg-black/60 text-white hover:bg-black/70"
          >
            <Link href="/tvshows" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to TV Shows
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative z-10 -mt-32 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
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

          <div className="flex-1 space-y-6">
            <Card className="shadow-lg">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <CardTitle className="text-3xl md:text-4xl">
                      {tvShow.title}
                    </CardTitle>
                    {tvShow.originalTitle && tvShow.originalTitle !== tvShow.title && (
                      <CardDescription className="text-base">
                        {tvShow.originalTitle}
                      </CardDescription>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {tvShow.originalLanguage && (
                        <span className="uppercase">{tvShow.originalLanguage}</span>
                      )}
                      {seasonCount > 0 && (
                        <span>
                          {seasonCount} season{seasonCount === 1 ? "" : "s"}
                        </span>
                      )}
                      {totalEpisodes > 0 && (
                        <span>
                          {totalEpisodes} episode{totalEpisodes === 1 ? "" : "s"}
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
                        <AlertDialogTitle>
                          Delete "{tvShow.title}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. The metadata for this TV show
                          will be permanently removed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingTVShow}>
                          Cancel
                        </AlertDialogCancel>
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
                      <span className="font-semibold text-foreground">
                        {tvShow.voteAverage.toFixed(1)}
                      </span>
                      <span>/10</span>
                    </Badge>
                    {tvShow.voteCount > 0 && (
                      <span className="text-muted-foreground">
                        {tvShow.voteCount.toLocaleString()} votes
                      </span>
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
                    <h2 className="text-lg font-semibold">Overview</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {tvShow.overview}
                    </p>
                  </div>
                )}

                {(tvShow.networks?.length || tvShow.libraryId) && (
                  <div className="space-y-4">
                    {tvShow.networks && tvShow.networks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Networks</h3>
                        <div className="flex flex-wrap gap-2">
                          {tvShow.networks.map((network) => (
                            <Badge key={network.tmdbId} variant="outline">
                              {network.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {tvShow.libraryId && (
                      <div className="space-y-1 text-sm">
                        <h3 className="font-semibold">Library</h3>
                        <p className="text-muted-foreground font-mono break-all">
                          {tvShow.libraryId}
                        </p>
                      </div>
                    )}
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      Metadata last updated: {new Date(tvShow.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {tvShow.cast && tvShow.cast.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cast</CardTitle>
                    <CardDescription>Top billed cast members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80 pr-4">
                      <div className="space-y-3">
                        {tvShow.cast
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .slice(0, 20)
                          .map((castMember) => (
                            <CastMemberCard
                              key={`${castMember.tmdbId}-${castMember.order}`}
                              castMember={castMember}
                            />
                          ))}
                      </div>
                      {tvShow.cast.length > 20 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Showing 20 of {tvShow.cast.length} cast members
                        </p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {tvShow.crew && tvShow.crew.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Crew</CardTitle>
                    <CardDescription>Key production members</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80 pr-4">
                      <div className="space-y-3">
                        {tvShow.crew
                          .slice()
                          .sort((a, b) => {
                            const importantJobs = [
                              "Creator",
                              "Director",
                              "Producer",
                              "Executive Producer",
                              "Writer",
                              "Screenplay",
                            ];
                            const aIndex = importantJobs.indexOf(a.job);
                            const bIndex = importantJobs.indexOf(b.job);

                            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                            if (aIndex !== -1) return -1;
                            if (bIndex !== -1) return 1;

                            return a.name.localeCompare(b.name);
                          })
                          .slice(0, 20)
                          .map((crewMember) => (
                            <CrewMemberCard
                              key={`${crewMember.tmdbId}-${crewMember.job}`}
                              crewMember={crewMember}
                            />
                          ))}
                      </div>
                      {tvShow.crew.length > 20 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Showing 20 of {tvShow.crew.length} crew members
                        </p>
                      )}
                    </ScrollArea>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAllSeasons}
                    disabled={expandedSeasons.length === 0}
                  >
                    Collapse all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tvShow.seasons && tvShow.seasons.length > 0 ? (
                  <Accordion
                    type="multiple"
                    value={expandedSeasons}
                    onValueChange={setExpandedSeasons}
                    className="space-y-2"
                  >
                    {tvShow.seasons.map((season) => {
                      const episodeCount = season.episodes?.length || 0;
                      const value = season.seasonNumber.toString();

                      return (
                        <AccordionItem key={value} value={value} className="rounded-lg border">
                          <AccordionTrigger className="px-4 py-3">
                            <div className="flex flex-col gap-2 text-left">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="text-base font-semibold">
                                  Season {season.seasonNumber}
                                </span>
                                {season.voteAverage > 0 && (
                                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                                    <Star className="h-3 w-3 text-yellow-500" />
                                    {season.voteAverage.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {episodeCount} episode{episodeCount === 1 ? "" : "s"}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 px-4">
                            {season.overview && (
                              <p className="text-sm text-muted-foreground">
                                {season.overview}
                              </p>
                            )}
                            {season.directoryPath && (
                              <p className="font-mono text-xs text-muted-foreground break-all">
                                {season.directoryPath}
                              </p>
                            )}
                            {episodeCount > 0 ? (
                              <div className="space-y-3">
                                {season.episodes.map((episode) => (
                                  <EpisodeCard
                                    key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                                    episode={episode}
                                  />
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm italic text-muted-foreground">
                                No episodes found for this season.
                              </p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No seasons metadata available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
