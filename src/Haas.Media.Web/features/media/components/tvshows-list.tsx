"use client";

import { useSearchParams } from "next/navigation";
import { useTVShows } from "@/features/media/hooks";
import type { TVShowMetadata } from "@/types/metadata";
import { LoadingSpinner } from "@/components/ui";

interface TVShowCardProps {
  tvShow: TVShowMetadata;
}

function TVShowCard({ tvShow }: TVShowCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      {tvShow.poster && (
        <div className="aspect-w-2 aspect-h-3 bg-gray-200 dark:bg-gray-700">
          <img
            src={tvShow.poster}
            alt={tvShow.title}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {tvShow.title}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          {tvShow.year && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {tvShow.year}
            </span>
          )}
          {tvShow.status && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {tvShow.status}
            </span>
          )}
        </div>
        {tvShow.genres && tvShow.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tvShow.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
        {tvShow.network && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {tvShow.network}
          </p>
        )}
        {tvShow.plot && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
            {tvShow.plot}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          {tvShow.seasons && (
            <span>
              {tvShow.seasons.length} season{tvShow.seasons.length !== 1 ? 's' : ''}
            </span>
          )}
          {tvShow.rating && (
            <div className="flex items-center">
              <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{tvShow.rating}/10</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TVShowsListProps {
  libraryId?: string;
}

export default function TVShowsList({ libraryId }: TVShowsListProps) {
  const searchParams = useSearchParams();
  const effectiveLibraryId = libraryId || searchParams.get('libraryId') || undefined;
  const { tvShows, loading, error } = useTVShows(effectiveLibraryId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  if (tvShows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex flex-col items-center justify-center space-y-3">
          <svg
            className="w-16 h-16 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v15.125c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <span className="text-gray-500 dark:text-gray-400">No TV shows found</span>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            TV shows will appear here after scanning your libraries
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          TV Shows ({tvShows.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {tvShows.map((tvShow) => (
          <TVShowCard key={tvShow.id} tvShow={tvShow} />
        ))}
      </div>
    </div>
  );
}
