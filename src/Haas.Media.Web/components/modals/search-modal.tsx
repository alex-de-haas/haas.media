"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SearchResult } from "@/types/metadata";
import { LibraryType } from "@/types/library";
import { useSearch, useAddToLibrary } from "@/features/media/hooks/useMetadata";
import { getPosterUrl } from "@/lib/tmdb";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Film, Search, Star, Tv } from "lucide-react";
import { Loader2, PlusCircle } from "lucide-react";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: LibraryType;
  title: string;
}

export default function SearchModal({ isOpen, onClose, mediaType, title }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { search, loading: isSearching } = useSearch();
  const { addToLibrary } = useAddToLibrary();

  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setError(null);
    try {
      const results = await search(searchQuery, mediaType);
      setSearchResults(results.filter((result: SearchResult) => result.type === mediaType));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    }
  };

  const handleAddToLibrary = async (result: SearchResult) => {
    setIsAdding(result.id.toString());
    setError(null);
    try {
      await addToLibrary({
        type: mediaType,
        id: result.id,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to library");
    } finally {
      setIsAdding(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !isSearching) {
      event.preventDefault();
      handleSearch();
    }
  };

  const libraryIcon = mediaType === LibraryType.Movies ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />;

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-4xl space-y-6">
        <DialogHeader className="text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm">
            {libraryIcon}
            <span>Search The Movie Database and add items to your library.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Search for ${mediaType === LibraryType.Movies ? "movies" : "TV shows"}…`}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="whitespace-nowrap">
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <ScrollArea className="max-h-[60vh] pr-2">
          {searchResults.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
              <Search className="h-10 w-10 text-muted-foreground/30" />
              <span>{searchQuery ? "No results found" : "Start typing to search The Movie Database."}</span>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm transition hover:border-primary/40 sm:flex-row"
                >
                  <div className="flex-shrink-0">
                    {result.posterPath ? (
                      <Image
                        src={getPosterUrl(result.posterPath) || ""}
                        alt={result.title}
                        width={120}
                        height={180}
                        className="h-[180px] w-[120px] rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-[180px] w-[120px] items-center justify-center rounded-md bg-muted">
                        <Search className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold leading-tight text-foreground">{result.title}</h4>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Star className="h-3.5 w-3.5 text-yellow-400" />
                          {result.voteAverage.toFixed(1)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.voteCount} votes
                        </Badge>
                      </div>
                      {result.originalTitle !== result.title && <p className="text-sm text-muted-foreground">{result.originalTitle}</p>}
                    </div>

                    <p className="line-clamp-4 text-sm text-muted-foreground">{result.overview || "No overview available."}</p>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {result.releaseDate && <span>Released {new Date(result.releaseDate).toLocaleDateString()}</span>}
                        {result.originalLanguage && <span className="uppercase">{result.originalLanguage}</span>}
                      </div>
                      <Button size="sm" onClick={() => handleAddToLibrary(result)} disabled={isAdding === result.id.toString()}>
                        {isAdding === result.id.toString() ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <PlusCircle className="mr-2 h-4 w-4" />
                        )}
                        Add to library
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
