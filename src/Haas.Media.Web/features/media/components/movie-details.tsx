"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMovie } from '@/features/media/hooks';
import { LoadingSpinner } from '@/components/ui';
import { getPosterUrl, getBackdropUrl } from '@/lib/tmdb';

interface MovieDetailsProps {
  movieId: string;
}

export default function MovieDetails({ movieId }: MovieDetailsProps) {
  const { movie, loading, error } = useMovie(movieId);
  const [imageError, setImageError] = useState(false);

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
            <svg className="w-6 h-6 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
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
                {error || 'The movie you requested could not be found.'}
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

  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
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
            <svg className="w-24 h-24 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        )}
        
        {/* Back Button - Floating over backdrop */}
        <div className="absolute top-6 left-6">
          <Link
            href="/movies"
            className="inline-flex items-center px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
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
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Movie Information */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
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

            {/* Rating */}
            {movie.voteAverage > 0 && (
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Additional Details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">TMDB ID:</span>
                  <span className="text-gray-900 dark:text-gray-100">{movie.tmdbId}</span>
                </div>
                {movie.originalLanguage && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Language:</span>
                    <span className="text-gray-900 dark:text-gray-100">{movie.originalLanguage.toUpperCase()}</span>
                  </div>
                )}
                {movie.releaseDate && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Release Date:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(movie.releaseDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">File Path:</span>
                  <span className="text-gray-900 dark:text-gray-100 text-right text-sm font-mono truncate max-w-64" title={movie.filePath}>
                    {movie.filePath}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
