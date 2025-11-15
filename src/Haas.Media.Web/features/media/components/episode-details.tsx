"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Calendar, Clock, Star, Tv, Play } from "lucide-react";

import { useTVShow } from "@/features/media/hooks";
import { useFilesByMediaId } from "@/features/media/hooks/useFileMetadata";
import { LibraryType } from "@/types/library";
import { Spinner } from "@/components/ui";
import { VideoPlayerDialog } from "@/components/ui/video-player-dialog";
import { getBackdropUrl, getStillUrl } from "@/lib/tmdb";
import type { TVEpisodeMetadata, FileMetadata } from "@/types/metadata";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { PersonCard } from "@/features/media/components/person-card";
import { useVideoPlayer } from "@/features/files/hooks/use-video-player";

interface EpisodeDetailsProps {
  tvShowId: number;
  seasonNumber: number;
  episodeNumber: number;
}

export default function EpisodeDetails({ tvShowId, seasonNumber, episodeNumber }: EpisodeDetailsProps) {
  const t = useTranslations("tvShows");
  const { tvShow, loading, error } = useTVShow(tvShowId);
  const { files: showFiles } = useFilesByMediaId(tvShowId, LibraryType.TVShows);
  const {
    isOpen: isVideoPlayerOpen,
    setIsOpen: setVideoPlayerOpen,
    openVideo,
    videoPath,
    transcode: videoShouldTranscode,
    quality: videoQuality,
    showStreamInfo: videoShowStreamInfo,
  } = useVideoPlayer({ quality: "high", showStreamInfo: true });

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

  const primaryPlayableFile = useMemo(() => {
    return episodeFiles.find((file) => !file.nodeId) ?? null;
  }, [episodeFiles]);

  const heroPrimaryCtaLabel = primaryPlayableFile ? t("playEpisodeCta") : t("playEpisodeFallbackCta");
  const heroCtaDescription = useMemo(() => {
    if (primaryPlayableFile) {
      return null;
    }

    if (episodeFiles.length === 0) {
      return t("playbackUnavailable");
    }

    return t("remotePlaybackUnavailable");
  }, [episodeFiles.length, primaryPlayableFile, t]);

  const handleHeroPlay = () => {
    if (!primaryPlayableFile) {
      return;
    }

    openVideo(primaryPlayableFile.filePath, episode?.name ?? primaryPlayableFile.filePath);
  };

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
          <AlertTitle>{t("episodeNotFound")}</AlertTitle>
          <AlertDescription>{error || t("episodeNotFoundDescription")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/tvshows" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> {t("backToTVShows")}
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
  const formattedSeasonEpisodeLabel = t("heroEpisodeLabel", { season: seasonNumber, episode: episodeNumber });

  return (
    <div className="flex flex-col gap-8 pb-16">
      <section className="relative isolate min-h-[520px] w-full overflow-hidden rounded-b-[32px] border border-border/30 bg-background">
        {backdropUrl ? (
          <Image src={backdropUrl} alt={`${tvShow.title} backdrop`} fill className="object-cover" priority />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted/40">
            <Tv className="h-24 w-24 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-background dark:from-black/80 dark:via-black/70 dark:to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

        <div className="relative z-10 mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 pb-10 pt-8 lg:gap-12">
          <div className="flex items-center justify-between text-white">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
            >
              <Link href={`/tvshows/${tvShowId}`} className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("backToShow", { title: tvShow.title })}
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
            <div className="order-2 flex flex-1 flex-col gap-5 text-white lg:order-1">
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">{tvShow.title}</p>
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{episode.name}</h1>
              <p className="text-lg text-white/80">{formattedSeasonEpisodeLabel}</p>

              <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                {episode.voteAverage > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 text-yellow-400" />
                    {episode.voteAverage.toFixed(1)}
                  </span>
                )}
                {episode.voteCount > 0 && <span>{t("voteCount", { count: episode.voteCount })}</span>}
                {formattedAirDate && (
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {formattedAirDate}
                  </span>
                )}
                {episode.runtime && (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t("minutes", { count: episode.runtime })}
                  </span>
                )}
              </div>

              {episode.overview && <p className="max-w-3xl text-base text-white/80 md:text-lg">{episode.overview}</p>}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={handleHeroPlay}
                  disabled={!primaryPlayableFile}
                  className={cn(
                    "h-14 rounded-full px-8 text-base font-semibold shadow-2xl shadow-primary/40",
                    !primaryPlayableFile ? "bg-white/20 text-white/70" : "bg-white text-black hover:bg-white/90",
                  )}
                >
                  <Play className="h-5 w-5" />
                  <span className="ml-2">{heroPrimaryCtaLabel}</span>
                </Button>
              </div>

              {heroCtaDescription && <p className="text-sm text-white/80">{heroCtaDescription}</p>}
              {primaryPlayableFile && (
                <p className="text-xs uppercase tracking-wide text-white/70">
                  {t("local")} • {primaryPlayableFile.filePath}
                </p>
              )}
            </div>

            <div className="order-1 flex justify-center lg:order-2">
              <div className="relative w-full max-w-[260px] sm:max-w-[320px]">
                <div className="rounded-[28px] border border-white/20 bg-white/5 p-1 shadow-2xl shadow-black/40 backdrop-blur">
                  {stillUrl ? (
                    <div className="relative aspect-video w-full">
                      <Image src={stillUrl} alt={`${episode.name} still`} fill className="rounded-[24px] object-cover" priority />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-[24px] bg-black/30">
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
        <div className="mx-auto w-full max-w-screen-xl">
          <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:items-start">
            <Card className="border-border/60 shadow-lg overflow-hidden lg:h-full">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">{t("overview")}</CardTitle>
                  <CardDescription>{t("episode")}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {episode.overview && <p className="text-base leading-relaxed text-muted-foreground">{episode.overview}</p>}

                <div className="grid gap-4 text-sm sm:grid-cols-2">
                  {formattedAirDate && (
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground">{t("airDate")}</span>
                      <p>{formattedAirDate}</p>
                    </div>
                  )}
                  {episode.runtime && (
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground">{t("runtime")}</span>
                      <p>{t("minutes", { count: episode.runtime })}</p>
                    </div>
                  )}
                </div>

                {episodeFiles.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">{t("localFiles")}</h3>
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
              </CardContent>
            </Card>

            {(hasCast || hasCrew) && (
              <Card className="border-border/60 shadow-lg overflow-hidden lg:h-full">
                <CardHeader className="space-y-4">
                  <div>
                    <CardTitle className="text-lg">{t("credits")}</CardTitle>
                    <CardDescription>{t("creditsDescription")}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {hasCast && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">{t("cast")}</h3>
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
                          {t("showingCastMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: episode.cast?.length ?? 0 })}
                        </p>
                      )}
                    </div>
                  )}

                  {hasCrew && (
                    <>
                      {hasCast && <Separator />}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">{t("crew")}</h3>
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
                            {t("showingCrewMembers", { displayed: CREDIT_DISPLAY_LIMIT, total: episode.crew?.length ?? 0 })}
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
      </section>

      <VideoPlayerDialog
        open={isVideoPlayerOpen}
        onOpenChange={setVideoPlayerOpen}
        videoPath={videoPath}
        title={episode.name}
        transcode={videoShouldTranscode ?? false}
        quality={videoQuality ?? "medium"}
        showStreamInfo={videoShowStreamInfo ?? false}
        className="rounded-2xl"
      />
    </div>
  );
}
