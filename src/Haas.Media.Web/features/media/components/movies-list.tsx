"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMovies } from "@/features/media/hooks";
import { useLibraries } from "@/features/libraries";
import type { MovieMetadata } from "@/types/metadata";
import { LibraryType } from "@/types/library";
import { MultiSelect, type Option, Spinner } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPosterUrl } from "@/lib/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CircleX, Film, Filter, HardDrive, Library, PackageOpen, RefreshCw, Star, Users } from "lucide-react";

interface MovieCardProps {
  movie: MovieMetadata;
}

function MovieCard({ movie }: MovieCardProps) {
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
  const posterUrl = getPosterUrl(movie.posterPath);
  const hasLocalFile = Boolean(movie.filePath);

  return (
    <Link href={`/movies/${movie.id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition hover:border-primary/60 hover:shadow-lg">
        <div className="relative aspect-[2/3] bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`${movie.title} poster`}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
              priority={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <Film className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          {hasLocalFile && (
            <Badge className="absolute left-3 top-3 flex items-center gap-1 bg-emerald-500 text-white shadow">
              <HardDrive className="h-3.5 w-3.5" />
              Local file
            </Badge>
          )}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">{movie.title}</h3>
            {releaseYear && <p className="text-xs text-muted-foreground">Released {releaseYear}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {movie.voteAverage > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Star className="h-3 w-3 text-yellow-400" />
                {movie.voteAverage.toFixed(1)}
              </Badge>
            )}
            {movie.voteCount > 0 && <span>({movie.voteCount} votes)</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface MoviesListProps {
  libraryId?: string;
}

export default function MoviesList({ libraryId }: MoviesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryLibraryId = searchParams.get("libraryId");
  const activeLibraryId = libraryId ?? queryLibraryId ?? null;
  const { libraries, loading: librariesLoading } = useLibraries();
  const libraryOptions = useMemo(
    () =>
      libraries
        .filter((lib) => lib.type === LibraryType.Movies && Boolean(lib.id))
        .map((lib) => ({
          value: lib.id as string,
          label: lib.title,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [libraries],
  );
  const { movies, loading, error, refetch } = useMovies(activeLibraryId ?? undefined);

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  const handleLibraryChange = (value: string) => {
    if (libraryId !== undefined) {
      return;
    }

    const nextLibraryId = value === "__all__" ? null : value;

    const params = new URLSearchParams(searchParams.toString());
    if (nextLibraryId) {
      params.set("libraryId", nextLibraryId);
    } else {
      params.delete("libraryId");
    }

    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  // Extract unique people (cast and crew) from all movies
  const peopleOptions = useMemo<Option[]>(() => {
    const peopleMap = new Map<number, { name: string; roles: Set<string> }>();

    movies.forEach((movie) => {
      // Add cast members
      movie.cast.forEach((member) => {
        if (!peopleMap.has(member.id)) {
          peopleMap.set(member.id, { name: member.name, roles: new Set() });
        }
        peopleMap.get(member.id)!.roles.add("Actor");
      });

      // Add crew members
      movie.crew.forEach((member) => {
        if (!peopleMap.has(member.id)) {
          peopleMap.set(member.id, { name: member.name, roles: new Set() });
        }
        peopleMap.get(member.id)!.roles.add(member.job);
      });
    });

    return Array.from(peopleMap.entries())
      .map(([id, data]) => {
        const roles = Array.from(data.roles).sort().join(", ");
        return {
          value: id.toString(),
          label: `${data.name} (${roles})`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [movies]);

  // Filter movies based on selected people
  const filteredMovies = useMemo(() => {
    if (selectedPeople.length === 0) {
      return movies;
    }

    return movies.filter((movie) => {
      return selectedPeople.every((personId) => {
        const hasCast = movie.cast.some((member) => member.id.toString() === personId);
        const hasCrew = movie.crew.some((member) => member.id.toString() === personId);
        return hasCast || hasCrew;
      });
    });
  }, [movies, selectedPeople]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load movies</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refetch} className="border-destructive text-destructive hover:bg-destructive/10">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (movies.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
          <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No movies found</p>
            <p className="text-xs">Movies will appear after your libraries finish scanning.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActivePeopleFilter = selectedPeople.length > 0;
  const canModifyLibraryFilter = libraryId === undefined;
  const hasLibraryFilter = canModifyLibraryFilter && activeLibraryId !== null;
  const filtersApplied = hasLibraryFilter || hasActivePeopleFilter;
  const activeFilterCount = selectedPeople.length + (hasLibraryFilter ? 1 : 0);

  const handleClearFilters = () => {
    if (selectedPeople.length > 0) {
      setSelectedPeople([]);
    }

    if (hasLibraryFilter) {
      handleLibraryChange("__all__");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Movies</h2>
        <Badge variant="outline" className="gap-1 text-xs">
          <Film className="h-3.5 w-3.5" />
          {filteredMovies.length} {hasActivePeopleFilter && `of ${movies.length}`} titles
        </Badge>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Filters
            {filtersApplied ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                {activeFilterCount} active
              </Badge>
            ) : (
              <span className="text-xs font-normal text-muted-foreground/80">Refine the library with quick filters</span>
            )}
          </div>
          {filtersApplied && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <CircleX className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid gap-4 pt-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Library className="h-4 w-4 text-muted-foreground" />
                Filter by library
              </span>
              <span className="text-xs text-muted-foreground">
                {libraryId !== undefined ? "Library is locked by the current page." : "Select a specific library or browse them all."}
              </span>
            </div>
            <Select
              value={activeLibraryId ?? "__all__"}
              onValueChange={handleLibraryChange}
              disabled={libraryId !== undefined || librariesLoading || libraryOptions.length === 0}
            >
              <SelectTrigger className="h-11 w-full rounded-lg border border-border/60 bg-background/80 px-3 text-sm shadow-sm transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <SelectValue
                  placeholder={
                    librariesLoading ? "Loading libraries..." : libraryOptions.length === 0 ? "No movie libraries found" : "All libraries"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All libraries</SelectItem>
                {libraryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="space-y-1">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                Filter by people
              </span>
              <span className="text-xs text-muted-foreground">Combine cast and crew to surface the perfect picks.</span>
            </div>
            <MultiSelect
              options={peopleOptions}
              selected={selectedPeople}
              onChange={setSelectedPeople}
              placeholder="Search cast and crew..."
              emptyMessage="No person found."
              className="h-11 w-full"
            />
          </div>
        </div>
      </div>

      {filteredMovies.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
            <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No movies match the selected filters</p>
              <p className="text-xs">Try adjusting your filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-6", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6")}>
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
}
