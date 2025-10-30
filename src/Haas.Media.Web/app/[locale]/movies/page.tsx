"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { AddToLibraryProgress, MoviesList } from "@/features/media/components";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/components/layout";
import { SearchModal } from "@/components/modals";
import { LibraryType } from "@/types/library";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

export default function MoviesPage() {
  const t = useTranslations("movies");
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  usePageTitle(t("title"));

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <AddToLibraryProgress libraryType={LibraryType.Movies} />
      <Button onClick={() => setIsSearchModalOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        {t("addMovie")}
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
        <MoviesList />
      </Suspense>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        mediaType={LibraryType.Movies}
        title={t("searchMovies")}
      />
    </main>
  );
}
