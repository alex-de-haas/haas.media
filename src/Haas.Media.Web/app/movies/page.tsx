"use client";

import { Suspense, useState } from "react";
import { MoviesList } from "@/features/media/components";
import { LoadingSpinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/components/layout";
import { SearchModal } from "@/components/modals";
import { LibraryType } from "@/types/library";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

export default function MoviesPage() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  usePageTitle("Movies");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <Button onClick={() => setIsSearchModalOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Movie
      </Button>

      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        }
      >
        <MoviesList />
      </Suspense>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        mediaType={LibraryType.Movies}
        title="Search Movies"
      />
    </main>
  );
}
