"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Star, Tv } from "lucide-react";

import { useTVShow } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { LibraryType } from "@/types/library";
import { Spinner } from "@/components/ui";
import { getBackdropUrl, getStillUrl } from "@/lib/tmdb";
import type { TVEpisodeMetadata, FileMetadata } from "@/types/metadata";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { PersonCard } from "@/features/media/components/person-card";

interface EpisodeDetailsProps {
  tvShowId: number;
  seasonNumber: number;
  episodeNumber: number;
}

export default function EpisodeDetails({ tvShowId, seasonNumber, episodeNumber }: EpisodeDetailsProps) {
  const { tvShow, loading, error } = useTVShow(tvShowId);
  const { files: showFiles } = useFilesByMediaId(tvShowId, LibraryType.TVShows);

  const episode = useMemo<TVEpisodeMetadata | null>(() => {
    if (!tvShow?.seasons) return null;
    const season = tvShow.seasons.find((s) => s.seasonNumber === seasonNumber);
    if (!season?.episodes) return null;
    return season.episodes.find((e) => e.episodeNumber === episodeNumber) ?? null;
  }, [tvShow, seasonNumber, episodeNumber]);

  const episodeFiles = useMemo<FileMetadata[]>(() => {
    return showFiles.filter((file) => file.seasonNumber === seasonNumber && file.episodeNumber === episodeNumber);
  }, [showFiles, seasonNumber, episodeNumber]);

  const formattedAirDate = useMemo(() => {
    if (!episode?.airDate) return null;
    try {
      return new Date(episode.airDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return null;
    }
  }, [episode?.airDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !tvShow || !episode) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Episode not found</AlertTitle>
          <AlertDescription>{error || "The episode you requested could not be found."}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tvshows" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to TV Shows
          </Link>
        </Button>
      </div>
    );
  }

  const backdropUrl = getBackdropUrl(tvShow.backdropPath);
  const stillUrl = getStillUrl(episode.stillPath);
  const CREDIT_DISPLAY_LIMIT = 20;
  const hasCast = Boolean(episode.cast && episode.cast.length > 0);
  const hasCrew = Boolean(episode.crew && episode.crew.length > 0);

  return (
    <div>
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-b from-background/80 to-background md:h-[500px]">
        {backdropUrl ? (
          <div className="relative h-full w-full">
            <Image src={backdropUrl} alt={`${tvShow.title} backdrop`} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40">
            <Tv className="h-24 w-24 text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-6 top-6">
          <Button asChild variant="secondary" size="sm" className="bg-black/60 text-white hover:bg-black/70">
            <Link href={`/tvshows/${tvShowId}`} className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to {tvShow.title}
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 -mt-32 px-4 py-8">
        <div className="mx-auto w-full max-w-screen-xl">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Episode Still Preview - Left Side */}
                {stillUrl && (
                  <div className="flex-shrink-0">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg lg:w-80">
                      <Image
                        src={stillUrl}
                        alt={`${episode.name} preview`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 320px"
                      />
                    </div>
                  </div>
                )}

                {/* Main Details - Right Side */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        {tvShow.title} • Season {seasonNumber} • Episode {episodeNumber}
                      </div>
                      <CardTitle className="text-3xl md:text-4xl">{episode.name}</CardTitle>
                    </div>

                    {/* Meta Information */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      {episode.voteAverage > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-semibold text-foreground">{episode.voteAverage.toFixed(1)}</span>
                        </Badge>
                      )}
                      {episode.voteCount > 0 && <span className="text-muted-foreground">{episode.voteCount.toLocaleString()} votes</span>}
                      {formattedAirDate && (
                        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
                          <Calendar className="h-4 w-4" />
                          {formattedAirDate}
                        </Badge>
                      )}
                      {episode.runtime && (
                        <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
                          <Clock className="h-4 w-4" />
                          {episode.runtime} min
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Overview */}
                  {episode.overview && (
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold">Overview</h2>
                      <p className="text-muted-foreground leading-relaxed">{episode.overview}</p>
                    </div>
                  )}

                  {/* Files */}
                  {episodeFiles.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Local Files</h3>
                        <div className="space-y-1">
                          {episodeFiles.map((file) => (
                            <p key={file.id} className="break-all font-mono text-xs text-muted-foreground">
                              {file.filePath}
                            </p>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits */}
          {(hasCast || hasCrew) && (
            <Card className="mt-6">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-lg">Episode Credits</CardTitle>
                  <CardDescription>Guest stars and crew for this episode</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasCast && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Guest Stars</h3>
                    <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                      <CarouselContent className="-ml-2 sm:-ml-4">
                        {episode.cast
                          ?.slice()
                          .sort((a, b) => a.order - b.order)
                          .slice(0, CREDIT_DISPLAY_LIMIT)
                          .map((castMember) => (
                            <CarouselItem
                              key={`${castMember.id}-${castMember.order}`}
                              className="basis-3/4 pl-2 sm:basis-1/2 sm:pl-4 md:basis-1/3 lg:basis-1/4"
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
                    {(episode.cast?.length ?? 0) > CREDIT_DISPLAY_LIMIT && (
                      <p className="text-xs text-muted-foreground">
                        Showing {CREDIT_DISPLAY_LIMIT} of {episode.cast?.length ?? 0} guest stars
                      </p>
                    )}
                  </div>
                )}

                {hasCrew && (
                  <>
                    {hasCast && <Separator />}
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Crew</h3>
                      <Carousel opts={{ align: "start", containScroll: "trimSnaps" }} className="w-full">
                        <CarouselContent className="-ml-2 sm:-ml-4">
                          {episode.crew
                            ?.slice()
                            .sort((a, b) => b.weight - a.weight)
                            .slice(0, CREDIT_DISPLAY_LIMIT)
                            .map((crewMember) => (
                              <CarouselItem
                                key={`${crewMember.id}-${crewMember.job}`}
                                className="basis-3/4 pl-2 sm:basis-1/2 sm:pl-4 md:basis-1/3 lg:basis-1/4"
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
                      {(episode.crew?.length ?? 0) > CREDIT_DISPLAY_LIMIT && (
                        <p className="text-xs text-muted-foreground">
                          Showing {CREDIT_DISPLAY_LIMIT} of {episode.crew?.length ?? 0} crew members
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
