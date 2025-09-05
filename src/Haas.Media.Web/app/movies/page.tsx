"use client";

import { Suspense, useState } from "react";
import { MoviesList } from "@/features/media/components";
import { LoadingSpinner } from "@/components/ui";
import { SearchModal } from "@/components/modals";
import { LibraryType } from "@/types/library";

export default function MoviesPage() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Movies
          </h1>
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Movie
          </button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Browse your movie collection
        </p>
      </div>
      
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <MoviesList />
      </Suspense>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        mediaType={LibraryType.Movies}
        title="Search Movies"
      />
    </div>
  );
}
