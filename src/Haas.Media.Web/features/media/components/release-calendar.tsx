"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, isAfter, startOfDay } from "date-fns";
import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  Feature,
  Status,
  useCalendarMonth,
  useCalendarYear,
} from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui";
import { useLocalAuth } from "@/features/auth/local-auth-context";
import { useMovies } from "@/features/media/hooks";
import type { MovieMetadata } from "@/types/metadata";
import { ReleaseDateType } from "@/types/metadata";
import { cn } from "@/lib/utils";

type MovieFeature = Feature<{ movie: MovieMetadata; releaseType: ReleaseDateType; countryCode?: string | null | undefined }>;

const RELEASE_TYPE_CONFIG: Record<ReleaseDateType, { key: string; color: string; bgColor: string }> = {
  [ReleaseDateType.Theatrical]: {
    key: "theatrical",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-500/10",
  },
  [ReleaseDateType.TheatricalLimited]: {
    key: "theatricalLimited",
    color: "text-cyan-700 dark:text-cyan-300",
    bgColor: "bg-cyan-500/10",
  },
  [ReleaseDateType.Digital]: {
    key: "digital",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-500/10",
  },
  [ReleaseDateType.Physical]: {
    key: "physical",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-500/10",
  },
  [ReleaseDateType.Tv]: {
    key: "tv",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-500/10",
  },
  [ReleaseDateType.Premiere]: {
    key: "premiere",
    color: "text-pink-700 dark:text-pink-300",
    bgColor: "bg-pink-500/10",
  },
};

function getDateKey(date: Date) {
  return startOfDay(date).getTime();
}

function getReleaseTypeConfig(type: ReleaseDateType) {
  return RELEASE_TYPE_CONFIG[type];
}

function filterReleaseDatesByCountry(releaseDates: MovieMetadata["releaseDates"], countryCode: string) {
  if (!releaseDates || releaseDates.length === 0) {
    return [];
  }

  const normalized = countryCode.toUpperCase();
  const preferred = releaseDates.filter((release) => release.countryCode?.toUpperCase() === normalized);
  return preferred.length > 0 ? preferred : releaseDates;
}

/**
 * Component that syncs calendar state with selected date
 * Must be rendered inside CalendarProvider
 */
function CalendarSync({ selectedDate, onSelectDate }: { selectedDate: Date | undefined; onSelectDate: (date?: Date) => void }) {
  const [month, setMonth] = useCalendarMonth();
  const [year, setYear] = useCalendarYear();
  const prevSelectedDateRef = useRef<Date | undefined>();
  const prevMonthRef = useRef<number>(month);
  const prevYearRef = useRef<number>(year);

  // Sync calendar view to selected date when it changes
  useEffect(() => {
    if (!selectedDate || prevSelectedDateRef.current?.getTime() === selectedDate.getTime()) {
      prevSelectedDateRef.current = selectedDate;
      return;
    }

    const targetMonth = selectedDate.getMonth() as Parameters<typeof setMonth>[0];
    const targetYear = selectedDate.getFullYear();

    // Update calendar view to show the selected date
    if (targetMonth !== month) {
      setMonth(targetMonth);
    }
    if (targetYear !== year) {
      setYear(targetYear);
    }

    prevSelectedDateRef.current = selectedDate;
    prevMonthRef.current = month;
    prevYearRef.current = year;
  }, [selectedDate, month, year, setMonth, setYear]);

  // When month/year changes (via navigation), clear selection
  useEffect(() => {
    // Check if month or year actually changed (and not from the initial render)
    const monthChanged = prevMonthRef.current !== month;
    const yearChanged = prevYearRef.current !== year;

    if (!monthChanged && !yearChanged) {
      return;
    }

    // Check if selected date is in current view
    const selectedMatchesCurrent = selectedDate && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

    if (!selectedMatchesCurrent) {
      // Clear selection when navigating to a different month/year
      onSelectDate(undefined);
    }

    prevMonthRef.current = month;
    prevYearRef.current = year;
  }, [month, year, selectedDate, onSelectDate]);

  return null;
}

export default function ReleaseCalendar() {
  const t = useTranslations("releases");
  const tMovies = useTranslations("movies");
  const { user } = useLocalAuth();
  const { movies, loading, error, refetch } = useMovies();

  const preferredCountry = useMemo(() => "US", []);

  // Create status objects with translations
  const STATUSES = useMemo<Record<"upcoming" | "released", Status>>(() => ({
    upcoming: {
      id: "upcoming",
      name: t("upcoming"),
      color: "hsl(var(--primary))",
    },
    released: {
      id: "released",
      name: t("released"),
      color: "hsl(var(--muted-foreground))",
    },
  }), [t]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void refetch();
  }, [preferredCountry, refetch, user?.username]);

  const today = useMemo(() => startOfDay(new Date()), []);

  // State for selected release types (all enabled by default)
  const [selectedReleaseTypes, setSelectedReleaseTypes] = useState<Set<ReleaseDateType>>(
    () => new Set(Object.values(ReleaseDateType).filter((v): v is ReleaseDateType => typeof v === "number")),
  );

  const toggleReleaseType = useCallback((type: ReleaseDateType) => {
    setSelectedReleaseTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const features = useMemo<MovieFeature[]>(() => {
    const items: MovieFeature[] = [];

    for (const movie of movies) {
      // Add all release dates from releaseDates array
      if (movie.releaseDates && movie.releaseDates.length > 0) {
        const releases = filterReleaseDatesByCountry(movie.releaseDates, preferredCountry);

        for (const release of releases) {
          // Filter by selected release types
          if (!selectedReleaseTypes.has(release.type)) {
            continue;
          }

          const parsed = new Date(release.date);
          if (!Number.isNaN(parsed.getTime())) {
            const normalized = startOfDay(parsed);
            const status = isAfter(normalized, today) ? STATUSES.upcoming : STATUSES.released;

            items.push({
              id: `${movie.id}-${release.type}-${release.date}`,
              name: movie.title,
              startAt: normalized,
              endAt: normalized,
              status,
              data: {
                movie,
                releaseType: release.type,
                countryCode: release.countryCode,
              },
            });
          }
        }
      }

      // Fallback to general releaseDate if no specific release dates
      if ((!movie.releaseDates || movie.releaseDates.length === 0) && movie.releaseDate) {
        // Only include if Theatrical type is selected
        if (!selectedReleaseTypes.has(ReleaseDateType.Theatrical)) {
          continue;
        }

        const parsed = new Date(movie.releaseDate);
        if (!Number.isNaN(parsed.getTime())) {
          const normalized = startOfDay(parsed);
          const status = isAfter(normalized, today) ? STATUSES.upcoming : STATUSES.released;

          items.push({
            id: `${movie.id}-general`,
            name: movie.title,
            startAt: normalized,
            endAt: normalized,
            status,
            data: {
              movie,
              releaseType: ReleaseDateType.Theatrical,
              countryCode: undefined,
            },
          });
        }
      }
    }

    return items;
  }, [movies, today, selectedReleaseTypes]);

  const featuresByDate = useMemo(() => {
    const map = new Map<number, MovieFeature[]>();

    for (const feature of features) {
      const key = feature.endAt.getTime();
      const list = map.get(key) ?? [];
      list.push(feature);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return map;
  }, [features]);

  const releaseDates = useMemo(() => {
    const dates = Array.from(featuresByDate.keys()).map((timestamp) => new Date(timestamp));
    dates.sort((a, b) => a.getTime() - b.getTime());
    return dates;
  }, [featuresByDate]);

  const { startYear, endYear } = useMemo(() => {
    if (releaseDates.length === 0) {
      const currentYear = new Date().getFullYear();
      return { startYear: currentYear, endYear: currentYear };
    }

    const years = releaseDates.map((date) => date.getFullYear());
    return {
      startYear: Math.min(...years),
      endYear: Math.max(...years),
    };
  }, [releaseDates]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleSelectDate = useCallback((date?: Date) => {
    setSelectedDate(date ? startOfDay(date) : undefined);
  }, []);

  const handleCalendarBodySelect = useCallback(
    (date: Date) => {
      handleSelectDate(date);
    },
    [handleSelectDate],
  );

  const selectedKey = selectedDate ? getDateKey(selectedDate) : undefined;
  const selectedFeatures = selectedKey !== undefined ? (featuresByDate.get(selectedKey) ?? []) : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Spinner className="size-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("unableToLoad")}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (releaseDates.length === 0) {
    // Check if it's because all release types are deselected
    if (selectedReleaseTypes.size === 0) {
      return (
        <Alert>
          <AlertTitle>{t("noReleaseTypesSelected")}</AlertTitle>
          <AlertDescription>{t("selectAtLeastOne")}</AlertDescription>
        </Alert>
      );
    }

    return (
      <Alert>
        <AlertTitle>{t("noReleases")}</AlertTitle>
        <AlertDescription>{t("addMovies")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(280px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("calendarTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Release Type Filter */}
          <div className="mb-6 rounded-lg border border-border/60 bg-muted/40 p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">{t("filterByType")}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(RELEASE_TYPE_CONFIG).map(([typeKey, config]) => {
                const type = Number(typeKey) as ReleaseDateType;
                const isChecked = selectedReleaseTypes.has(type);

                return (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox id={`release-type-${type}`} checked={isChecked} onCheckedChange={() => toggleReleaseType(type)} />
                    <Label htmlFor={`release-type-${type}`} className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full flex-shrink-0",
                          type === ReleaseDateType.Theatrical && "bg-blue-500",
                          type === ReleaseDateType.TheatricalLimited && "bg-cyan-500",
                          type === ReleaseDateType.Digital && "bg-purple-500",
                          type === ReleaseDateType.Physical && "bg-green-500",
                          type === ReleaseDateType.Tv && "bg-orange-500",
                          type === ReleaseDateType.Premiere && "bg-pink-500",
                        )}
                      />
                      {t(config.key)}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          <CalendarProvider className="space-y-4">
            <CalendarSync selectedDate={selectedDate} onSelectDate={handleSelectDate} />
            <CalendarDate>
              <CalendarDatePicker>
                <CalendarMonthPicker />
                <CalendarYearPicker end={endYear} start={startYear} />
              </CalendarDatePicker>
              <CalendarDatePagination />
            </CalendarDate>
            <CalendarHeader />
            <CalendarBody
              features={features}
              onSelectDate={handleCalendarBodySelect}
              today={today}
              {...(selectedDate ? { selectedDate } : {})}
            >
              {({ feature, isSelected }) => {
                const releaseType = feature.data?.releaseType ?? ReleaseDateType.Theatrical;
                const config = getReleaseTypeConfig(releaseType);

                return (
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.7rem] font-medium transition-colors",
                      feature.status.id === STATUSES.upcoming.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                      isSelected && "ring-1 ring-primary/50",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        releaseType === ReleaseDateType.Digital && "bg-purple-500",
                        releaseType === ReleaseDateType.Theatrical && "bg-blue-500",
                        releaseType === ReleaseDateType.TheatricalLimited && "bg-cyan-500",
                        releaseType === ReleaseDateType.Physical && "bg-green-500",
                        releaseType === ReleaseDateType.Tv && "bg-orange-500",
                        releaseType === ReleaseDateType.Premiere && "bg-pink-500",
                      )}
                      title={t(config.key)}
                    />
                    <span className="truncate">{feature.name}</span>
                  </div>
                );
              }}
            </CalendarBody>
          </CalendarProvider>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t("calendarHelpText")}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span>{t("theatrical")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span>{t("limited")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <span>{t("digital")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>{t("physical")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-500" />
                <span>{t("tv")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-pink-500" />
                <span>{t("premiere")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : t("selectDate")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedDate
              ? selectedFeatures.length > 0
                ? t("releasesScheduled", { 
                    count: selectedFeatures.length, 
                    plural: selectedFeatures.length === 1 ? t("release") : t("releases_plural") 
                  })
                : t("noReleasesForDay")
              : t("chooseDate")}
          </p>
        </div>

        {selectedFeatures.length > 0 ? (
          <div className="grid gap-4">
            {selectedFeatures.map((feature) => {
              const movie = feature.data?.movie;
              const releaseType = feature.data?.releaseType;
              const countryCode = feature.data?.countryCode;

              if (!movie || releaseType === undefined || releaseType === null) {
                return null;
              }

              const isUpcoming = feature.status.id === STATUSES.upcoming.id;
              const config = getReleaseTypeConfig(releaseType);

              return (
                <Card key={feature.id} className={cn("border-border/70", isUpcoming ? "border-primary/40" : undefined)}>
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl font-semibold leading-tight">
                        <Link href={`/movies/${movie.id}`} className="hover:underline hover:text-primary transition-colors">
                          {feature.name}
                        </Link>
                      </CardTitle>
                      <Badge variant={isUpcoming ? "outline" : "secondary"}>{feature.status.name}</Badge>
                      <Badge variant="secondary" className={cn(config.bgColor, config.color)}>
                        {t(config.key)}
                      </Badge>
                      {countryCode && (
                        <Badge variant="outline" className="text-xs">
                          {countryCode}
                        </Badge>
                      )}
                    </div>
                    {movie.originalTitle && movie.originalTitle !== feature.name && (
                      <span className="text-sm text-muted-foreground">
                        {t("originalTitle", { title: movie.originalTitle })}
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {t("releaseOn", { type: t(config.key), date: format(feature.endAt, "MMMM d, yyyy") })}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-3">
                      {movie.genres?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{tMovies("genres")}</span>
                          <div className="flex flex-wrap gap-2">
                            {movie.genres.map((genre) => (
                              <Badge key={`${feature.id}-${genre}`} variant="outline">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {typeof movie.voteAverage === "number" && movie.voteAverage > 0 && (
                        <span>
                          {t("tmdbRating", { rating: movie.voteAverage.toFixed(1) })}
                        </span>
                      )}
                    </div>
                    {movie.overview && (
                      <>
                        <Separator />
                        <p className="leading-relaxed text-foreground/80">{movie.overview}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertTitle>{t("noReleasesSelected")}</AlertTitle>
            <AlertDescription>{t("selectHighlightedDate")}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
