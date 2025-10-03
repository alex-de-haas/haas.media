"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isAfter, startOfDay } from "date-fns";

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
import { LoadingSpinner } from "@/components/ui";
import { useMovies } from "@/features/media/hooks";
import type { MovieMetadata } from "@/types/metadata";
import { cn } from "@/lib/utils";

type MovieFeature = Feature<{ movie: MovieMetadata }>;

const STATUSES: Record<"upcoming" | "released", Status> = {
  upcoming: {
    id: "upcoming",
    name: "Upcoming",
    color: "hsl(var(--primary))",
  },
  released: {
    id: "released",
    name: "Released",
    color: "hsl(var(--muted-foreground))",
  },
};

function getDateKey(date: Date) {
  return startOfDay(date).getTime();
}

type CalendarStateManagerProps = {
  selectedDate?: Date;
  releaseDates: Date[];
  onSelect: (date?: Date) => void;
};

function CalendarStateManager({ selectedDate, releaseDates, onSelect }: CalendarStateManagerProps) {
  const [month, setMonth] = useCalendarMonth();
  const [year, setYear] = useCalendarYear();

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    const targetMonth = selectedDate.getMonth() as Parameters<typeof setMonth>[0];
    const targetYear = selectedDate.getFullYear();

    if (targetMonth !== month || targetYear !== year) {
      setMonth(targetMonth);
      setYear(targetYear);
    }
  }, [selectedDate, month, year, setMonth, setYear]);

  useEffect(() => {
    const selectedMatchesCurrent =
      selectedDate && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;

    if (selectedMatchesCurrent) {
      return;
    }

    const firstInMonth = releaseDates.find(
      (date) => date.getMonth() === month && date.getFullYear() === year
    );

    if (firstInMonth) {
      onSelect(firstInMonth);
    } else if (selectedDate && !selectedMatchesCurrent) {
      onSelect(undefined);
    }
  }, [month, year, releaseDates, selectedDate, onSelect]);

  return null;
}

export default function DigitalReleaseCalendar() {
  const { movies, loading, error } = useMovies();

  const today = useMemo(() => startOfDay(new Date()), []);

  const features = useMemo<MovieFeature[]>(() => {
    const items: MovieFeature[] = [];

    for (const movie of movies) {
      if (!movie.digitalReleaseDate) {
        continue;
      }

      const parsed = new Date(movie.digitalReleaseDate);
      if (Number.isNaN(parsed.getTime())) {
        continue;
      }

      const normalized = startOfDay(parsed);
      const status = isAfter(normalized, today) ? STATUSES.upcoming : STATUSES.released;

      items.push({
        id: movie.id,
        name: movie.title,
        startAt: normalized,
        endAt: normalized,
        status,
        data: { movie },
      });
    }

    return items;
  }, [movies, today]);

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

  const initialSelectedDate = useMemo(() => {
    if (releaseDates.length === 0) {
      return undefined;
    }

    const upcoming = releaseDates.find((date) => !isAfter(today, date));
    if (upcoming) {
      return startOfDay(upcoming);
    }

    const lastReleaseDate = releaseDates[releaseDates.length - 1];
    return lastReleaseDate ? startOfDay(lastReleaseDate) : undefined;
  }, [releaseDates, today]);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialSelectedDate);

  useEffect(() => {
    setSelectedDate((prev) => {
      if (prev) {
        const key = getDateKey(prev);
        if (featuresByDate.has(key)) {
          return prev;
        }
      }

      return initialSelectedDate;
    });
  }, [featuresByDate, initialSelectedDate]);

  const handleSelectDate = useCallback((date?: Date) => {
    setSelectedDate(date ? startOfDay(date) : undefined);
  }, []);

  const handleCalendarBodySelect = useCallback(
    (date: Date) => {
      handleSelectDate(date);
    },
    [handleSelectDate]
  );

  const selectedKey = selectedDate ? getDateKey(selectedDate) : undefined;
  const selectedFeatures = selectedKey !== undefined ? featuresByDate.get(selectedKey) ?? [] : [];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load digital releases</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (releaseDates.length === 0) {
    return (
      <Alert>
        <AlertTitle>No digital releases found</AlertTitle>
        <AlertDescription>Add movies with digital release dates to see them appear here.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr),minmax(280px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Release Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarProvider className="space-y-4">
            <CalendarStateManager
              onSelect={handleSelectDate}
              releaseDates={releaseDates}
              {...(selectedDate ? { selectedDate } : {})}
            />
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
              {...(selectedDate ? { selectedDate } : {})}
            >
              {({ feature, isSelected }) => (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1 text-[0.7rem] font-medium transition-colors",
                    feature.status.id === STATUSES.upcoming.id
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground",
                    isSelected && "ring-1 ring-primary/50"
                  )}
                >
                  <span className="truncate">{feature.name}</span>
                </div>
              )}
            </CalendarBody>
          </CalendarProvider>
          <p className="mt-4 text-sm text-muted-foreground">
            Dates with color accents indicate digital releases. Pick a day to explore the scheduled titles.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedDate
              ? selectedFeatures.length > 0
                ? `${selectedFeatures.length} digital ${selectedFeatures.length === 1 ? "release" : "releases"} scheduled`
                : "No digital releases scheduled for this day"
              : "Choose a highlighted date to view scheduled releases."}
          </p>
        </div>

        {selectedFeatures.length > 0 ? (
          <div className="grid gap-4">
            {selectedFeatures.map((feature) => {
              const movie = feature.data?.movie;
              if (!movie) {
                return null;
              }

              const isUpcoming = feature.status.id === STATUSES.upcoming.id;

              return (
                <Card key={feature.id} className={cn("border-border/70", isUpcoming ? "border-primary/40" : undefined)}>
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl font-semibold leading-tight">{feature.name}</CardTitle>
                      <Badge variant={isUpcoming ? "outline" : "secondary"}>{feature.status.name}</Badge>
                    </div>
                    {movie.originalTitle && movie.originalTitle !== feature.name && (
                      <span className="text-sm text-muted-foreground">
                        Original title: <span className="font-medium text-foreground">{movie.originalTitle}</span>
                      </span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      Digital release: {format(feature.endAt, "MMMM d, yyyy")}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-3">
                      {movie.genres?.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">Genres</span>
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
                          <span className="font-medium text-foreground">TMDB:</span> {movie.voteAverage.toFixed(1)} / 10
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
            <AlertTitle>No releases selected</AlertTitle>
            <AlertDescription>Select a highlighted date to view release details.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
