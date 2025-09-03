import { Suspense } from "react";
import { TVShowsList } from "@/features/media/components";
import { LoadingSpinner } from "@/components/ui";

export default function TVShowsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          TV Shows
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse your TV show collection
        </p>
      </div>
      
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <TVShowsList />
      </Suspense>
    </div>
  );
}
