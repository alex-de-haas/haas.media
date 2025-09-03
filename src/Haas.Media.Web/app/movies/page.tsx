import { Suspense } from "react";
import { MoviesList } from "@/features/media/components";
import { LoadingSpinner } from "@/components/ui";

export default function MoviesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Movies
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse your movie collection
        </p>
      </div>
      
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <MoviesList />
      </Suspense>
    </div>
  );
}
