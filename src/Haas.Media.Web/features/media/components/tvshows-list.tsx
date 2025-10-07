"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTVShows } from "@/features/media/hooks";
import type { TVShowMetadata } from "@/types/metadata";
import { MultiSelect, type Option, Spinner } from "@/components/ui";
import { getPosterUrl } from "@/lib/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HardDrive, Layers, PackageOpen, RefreshCw, Star, Tv } from "lucide-react";

interface TVShowCardProps {
  tvShow: TVShowMetadata;
}

function TVShowCard({ tvShow }: TVShowCardProps) {
  const posterUrl = getPosterUrl(tvShow.posterPath);
  const seasonCount = tvShow.seasons?.length ?? 0;
  const hasLinkedEpisode = (tvShow.seasons ?? []).some((season) => (season.episodes ?? []).some((episode) => Boolean(episode.filePath)));

  return (
    <Link href={`/tvshows/${tvShow.id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition hover:border-primary/60 hover:shadow-lg">
        <div className="relative aspect-[2/3] bg-muted">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={`${tvShow.title} poster`}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <Tv className="h-10 w-10 text-muted-foreground" />
            </div>
          )}

          {hasLinkedEpisode && (
            <Badge className="absolute left-3 top-3 flex items-center gap-1 bg-emerald-500 text-white shadow">
              <HardDrive className="h-3.5 w-3.5" />
              Local files
            </Badge>
          )}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">{tvShow.title}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {seasonCount > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Layers className="h-3 w-3" />
                {seasonCount} season{seasonCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {tvShow.voteAverage > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Star className="h-3 w-3 text-yellow-400" />
                {tvShow.voteAverage.toFixed(1)}
              </Badge>
            )}
            {tvShow.voteCount > 0 && <span>({tvShow.voteCount} votes)</span>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface TVShowsListProps {
  libraryId?: string;
}

export default function TVShowsList({ libraryId }: TVShowsListProps) {
  const searchParams = useSearchParams();
  const effectiveLibraryId = libraryId || searchParams.get("libraryId") || undefined;
  const { tvShows, loading, error, refetch } = useTVShows(effectiveLibraryId);
  
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  // Extract unique people (cast and crew) from all TV shows
  const peopleOptions = useMemo<Option[]>(() => {
    const peopleMap = new Map<number, { name: string; roles: Set<string> }>();
    
    tvShows.forEach((show) => {
      // Add cast members
      show.cast.forEach((member) => {
        if (!peopleMap.has(member.id)) {
          peopleMap.set(member.id, { name: member.name, roles: new Set() });
        }
        peopleMap.get(member.id)!.roles.add("Actor");
      });
      
      // Add crew members
      show.crew.forEach((member) => {
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
  }, [tvShows]);

  // Filter TV shows based on selected people
  const filteredTVShows = useMemo(() => {
    if (selectedPeople.length === 0) {
      return tvShows;
    }

    return tvShows.filter((show) => {
      return selectedPeople.every((personId) => {
        const hasCast = show.cast.some((member) => member.id.toString() === personId);
        const hasCrew = show.crew.some((member) => member.id.toString() === personId);
        return hasCast || hasCrew;
      });
    });
  }, [tvShows, selectedPeople]);

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
        <AlertTitle>Unable to load TV shows</AlertTitle>
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

  if (tvShows.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
          <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No TV shows found</p>
            <p className="text-xs">TV shows will appear after your libraries finish scanning.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasActiveFilters = selectedPeople.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">TV Shows</h2>
        <Badge variant="outline" className="gap-1 text-xs">
          <Tv className="h-3.5 w-3.5" />
          {filteredTVShows.length} {hasActiveFilters && `of ${tvShows.length}`} series
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

      {filteredTVShows.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
            <PackageOpen className="h-12 w-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No TV shows match the selected filters</p>
              <p className="text-xs">Try adjusting your filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-6", "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6")}>
          {filteredTVShows.map((tvShow) => (
            <TVShowCard key={tvShow.id} tvShow={tvShow} />
          ))}
        </div>
      )}
    </div>
  );
}
