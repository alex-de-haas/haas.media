"use client";

import { Suspense, useState } from "react";
import { AddToLibraryProgress, TVShowsList } from "@/features/media/components";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/components/layout";
import { SearchModal } from "@/components/modals";
import { LibraryType } from "@/types/library";
import { PlusCircle } from "lucide-react";

export default function TVShowsPage() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  usePageTitle("TV Shows");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <AddToLibraryProgress libraryType={LibraryType.TVShows} />
      <Button onClick={() => setIsSearchModalOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add TV Show
      </Button>

      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Spinner className="size-8" />
            </CardContent>
          </Card>
        }
      >
        <TVShowsList />
      </Suspense>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        mediaType={LibraryType.TVShows}
        title="Search TV Shows"
      />
    </main>
  );
}
