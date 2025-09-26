"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMovie, useDeleteMovieMetadata } from "@/features/media/hooks";
import { LoadingSpinner } from "@/components/ui";
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb";
import { CrewMember, CastMember } from "@/types/metadata";
import { useNotifications } from "@/lib/notifications";

interface MovieDetailsProps {
  movieId: string;
}

interface CrewMemberCardProps {
  crewMember: CrewMember;
}

interface CastMemberCardProps {
  castMember: CastMember;
}

function CastMemberCard({ castMember }: CastMemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        {castMember.profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${castMember.profilePath}`}
            alt={castMember.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {castMember.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          as {castMember.character}
        </p>
      </div>
    </div>
  );
}

function CrewMemberCard({ crewMember }: CrewMemberCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0">
        {crewMember.profilePath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w92${crewMember.profilePath}`}
            alt={crewMember.name}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {crewMember.name}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {crewMember.job}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
          {crewMember.department}
        </p>
      </div>
    </div>
  );
}

export default function MovieDetails({ movieId }: MovieDetailsProps) {
  const { movie, loading, error } = useMovie(movieId);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const router = useRouter();
  const { notify } = useNotifications();
  const { deleteMovie, loading: deletingMovie } = useDeleteMovieMetadata();

  const handleDelete = async () => {
    if (!movie || deletingMovie) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${movie.title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setShowActions(false);
    const result = await deleteMovie(movie.id);

    if (result.success) {
      notify({
        type: "success",
        title: "Movie Deleted",
        message: `${movie.title} metadata was removed.`,
      });
      router.push("/movies");
    } else {
      notify({
        type: "error",
        title: "Delete Failed",
        message: result.message || "Unable to delete movie metadata.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 text-red-400 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
                Movie not found
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                {error || "The movie you requested could not be found."}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/movies"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-200 dark:bg-red-800 dark:hover:bg-red-700"
            >
              ← Back to Movies
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;
  const posterUrl = getPosterUrl(movie.posterPath);
  const backdropUrl = getBackdropUrl(movie.backdropPath);

  return (
    <div>
      {/* Backdrop Section */}
      <div className="relative h-96 md:h-[500px] bg-gradient-to-b from-gray-900 to-gray-800">
        {backdropUrl && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={backdropUrl}
              alt={`${movie.title} backdrop`}
              fill
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <svg
              className="w-24 h-24 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
        )}

        {/* Back Button - Floating over backdrop */}
        <div className="absolute top-6 left-6">
          <Link
            href="/movies"
            className="inline-flex items-center px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm border border-white/10"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Movies
          </Link>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-8 -mt-32 relative z-10">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Poster */}
          <div className="flex-shrink-0">
            <div className="w-64 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden shadow-2xl">
              {posterUrl ? (
                <Image
                  src={posterUrl}
                  alt={`${movie.title} poster`}
                  width={256}
                  height={384}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                  <svg
                    className="w-16 h-16 text-gray-400 dark:text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Movie Information */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {movie.title}
                  </h1>
                  {movie.originalTitle && movie.originalTitle !== movie.title && (
                    <p className="text-lg text-gray-600 dark:text-gray-400 italic mb-2">
                      {movie.originalTitle}
                    </p>
                  )}
                  {releaseYear && (
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      {releaseYear}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowActions((prev) => !prev)}
                    className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Movie actions"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>

                  {showActions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-20 dark:bg-gray-800 dark:border-gray-700">
                      <div className="py-1">
                        <button
                          onClick={handleDelete}
                          disabled={deletingMovie}
                          className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <svg
                            className="w-4 h-4 mr-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {deletingMovie ? "Deleting..." : "Delete Movie"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rating */}
            {movie.voteAverage > 0 && (
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                  <svg
                    className="w-5 h-5 text-yellow-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {movie.voteAverage.toFixed(1)}/10
                  </span>
                  {movie.voteCount > 0 && (
                    <span className="ml-2 text-sm text-yellow-700 dark:text-yellow-300">
                      ({movie.voteCount.toLocaleString()} votes)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Genres
                </h2>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Overview
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                  {movie.overview}
                </p>
              </div>
            )}

            {/* Cast */}
            {movie.cast && movie.cast.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Cast
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {movie.cast
                    .sort((a, b) => a.order - b.order) // Sort by cast order
                    .slice(0, 20) // Limit to first 20 cast members to avoid overwhelming the UI
                    .map((castMember) => (
                      <CastMemberCard key={`${castMember.tmdbId}-${castMember.order}`} castMember={castMember} />
                    ))}
                </div>
                {movie.cast.length > 20 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Showing 20 of {movie.cast.length} cast members
                  </p>
                )}
              </div>
            )}

            {/* Crew */}
            {movie.crew && movie.crew.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Crew
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {movie.crew
                    .sort((a, b) => {
                      // Sort by importance (Director, Producer, etc. first)
                      const importantJobs = ['Director', 'Producer', 'Executive Producer', 'Writer', 'Screenplay'];
                      const aIndex = importantJobs.indexOf(a.job);
                      const bIndex = importantJobs.indexOf(b.job);
                      
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      
                      return a.name.localeCompare(b.name);
                    })
                    .slice(0, 20) // Limit to first 20 crew members to avoid overwhelming the UI
                    .map((crewMember) => (
                      <CrewMemberCard key={`${crewMember.tmdbId}-${crewMember.job}`} crewMember={crewMember} />
                    ))}
                </div>
                {movie.crew.length > 20 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Showing 20 of {movie.crew.length} crew members
                  </p>
                )}
              </div>
            )}

            {/* Additional Details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {movie.releaseDate && (
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Release Date:
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(movie.releaseDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              {movie.filePath ? (
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate"
                  title={movie.filePath}
                >
                  {movie.filePath}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No local file linked
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
