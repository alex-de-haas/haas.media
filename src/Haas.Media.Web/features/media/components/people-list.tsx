"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePeople } from "@/features/media/hooks";
import type { PersonMetadata } from "@/types/metadata";
import { Spinner } from "@/components/ui";
import { getProfileUrl } from "@/lib/tmdb";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleX, RefreshCw, Search, User } from "lucide-react";

interface PersonCardProps {
  person: PersonMetadata;
}

function PersonCard({ person }: PersonCardProps) {
  const profileUrl = getProfileUrl(person.profilePath);

  return (
    <Link href={`/people/${person.id}`} className="group block">
      <Card className="h-full overflow-hidden border-border/60 transition hover:border-primary/60 hover:shadow-lg">
        <div className="relative aspect-[2/3] bg-muted">
          {profileUrl ? (
            <Image
              src={profileUrl}
              alt={`${person.name} profile`}
              fill
              className="object-cover transition duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 20vw"
              priority={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-card">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="line-clamp-2 text-base font-semibold leading-tight text-foreground">{person.name}</h3>
            {person.placeOfBirth && <p className="line-clamp-1 text-xs text-muted-foreground">{person.placeOfBirth}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {person.popularity > 0 && (
              <Badge variant="secondary" className="text-xs">
                Popularity: {person.popularity.toFixed(1)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PeopleList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { people, totalCount, loading, loadingMore, error, hasMore, loadMore, refetch } = usePeople(searchQuery);
  const hasActiveSearch = Boolean(searchQuery.trim());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const shouldShowLoadMore = hasMore;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!shouldShowLoadMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [shouldShowLoadMore, loading, loadingMore, loadMore]);

  if (loading && people.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Spinner className="size-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <CircleX className="h-4 w-4" />
        <AlertTitle>Error loading people</AlertTitle>
        <AlertDescription className="space-y-4">
          <p>{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasActiveSearch && people.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <User className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No people found</h3>
          <p className="mb-4 text-sm text-muted-foreground">People will appear here after you scan your libraries.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {hasActiveSearch
              ? `${totalCount} ${totalCount === 1 ? "matching person" : "matching people"}`
              : `${totalCount} ${totalCount === 1 ? "person" : "people"}`}
          </h2>
          {people.length < totalCount && totalCount > 0 && <span className="text-sm text-muted-foreground">(loaded {people.length})</span>}
          <Button variant="ghost" size="icon" onClick={refetch} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {loading && people.length > 0 && <Spinner className="ml-2 size-4 text-muted-foreground" />}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {hasActiveSearch && people.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search query</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>

          {/* Load more trigger */}
          {shouldShowLoadMore && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-8">
              <Spinner className="size-8" />
              <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
            </div>
          )}

          {/* End message */}
          {!shouldShowLoadMore && totalCount > 0 && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">All {totalCount} people loaded</div>
          )}
        </>
      )}
    </div>
  );
}
