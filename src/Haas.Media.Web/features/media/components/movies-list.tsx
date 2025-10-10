"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMovies } from "@/features/media/hooks";
import type { MovieMetadata } from "@/types/metadata";
import { MultiSelect, type Option, Spinner } from "@/components/ui";
import { getPosterUrl } from "@/lib/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Film, HardDrive, PackageOpen, RefreshCw, Star } from "lucide-react";

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
  const searchParams = useSearchParams();
  const effectiveLibraryId = libraryId || searchParams.get("libraryId") || undefined;
  const { movies, loading, error, refetch } = useMovies(effectiveLibraryId);

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

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

  const hasActiveFilters = selectedPeople.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Movies</h2>
        <Badge variant="outline" className="gap-1 text-xs">
          <Film className="h-3.5 w-3.5" />
          {filteredMovies.length} {hasActiveFilters && `of ${movies.length}`} titles
        </Badge>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Filter by People</label>
        <MultiSelect
          options={peopleOptions}
          selected={selectedPeople}
          onChange={setSelectedPeople}
          placeholder="Search cast and crew..."
          emptyMessage="No person found."
        />
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
