"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTVShow } from '@/features/media/hooks';
import { LoadingSpinner } from '@/components/ui';
import { getPosterUrl, getBackdropUrl } from '@/lib/tmdb';
import type { TVSeasonMetadata, TVEpisodeMetadata, CrewMember, CastMember } from '@/types/metadata';

interface TVShowDetailsProps {
  tvShowId: string;
}

interface SeasonCardProps {
  season: TVSeasonMetadata;
  isExpanded: boolean;
  onToggle: () => void;
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

interface EpisodeCardProps {
  episode: TVEpisodeMetadata;
}

function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Episode {episode.episodeNumber}: {episode.name}
        </h4>
        {episode.voteAverage > 0 && (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <svg className="w-3 h-3 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{episode.voteAverage.toFixed(1)}</span>
          </div>
        )}
      </div>
      {episode.overview && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
          {episode.overview}
        </p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={episode.filePath}>
        {episode.filePath}
      </p>
    </div>
  );
}

function SeasonCard({ season, isExpanded, onToggle }: SeasonCardProps) {
  const episodeCount = season.episodes?.length || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Season {season.seasonNumber}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>{episodeCount} episode{episodeCount !== 1 ? 's' : ''}</span>
              {season.voteAverage > 0 && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{season.voteAverage.toFixed(1)}/10</span>
                </div>
              )}
            </div>
            {season.overview && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                {season.overview}
              </p>
            )}
          </div>
          <div className="ml-4">
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
          {episodeCount > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Episodes ({episodeCount})
              </h4>
              {season.episodes.map((episode) => (
                <EpisodeCard key={`${episode.seasonNumber}-${episode.episodeNumber}`} episode={episode} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No episodes found for this season
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TVShowDetails({ tvShowId }: TVShowDetailsProps) {
  const { tvShow, loading, error } = useTVShow(tvShowId);
  const [imageError, setImageError] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

  const toggleSeason = (seasonNumber: number) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonNumber)) {
        newSet.delete(seasonNumber);
      } else {
        newSet.add(seasonNumber);
      }
      return newSet;
    });
  };

  const expandAllSeasons = () => {
    if (tvShow?.seasons) {
      setExpandedSeasons(new Set(tvShow.seasons.map(s => s.seasonNumber)));
    }
  };

  const collapseAllSeasons = () => {
    setExpandedSeasons(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !tvShow) {
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
                TV Show not found
              </h3>
              <p className="text-red-700 dark:text-red-300 mt-1">
                {error || 'The TV show you requested could not be found.'}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/tvshows"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:text-red-200 dark:bg-red-800 dark:hover:bg-red-700"
            >
              ← Back to TV Shows
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const posterUrl = getPosterUrl(tvShow.posterPath);
  const backdropUrl = getBackdropUrl(tvShow.backdropPath);
  const totalEpisodes = tvShow.seasons?.reduce((total, season) => total + (season.episodes?.length || 0), 0) || 0;

  return (
    <div>
      {/* Backdrop Section */}
      <div className="relative h-96 md:h-[500px] bg-gradient-to-b from-gray-900 to-gray-800">
        {backdropUrl && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={backdropUrl}
              alt={`${tvShow.title} backdrop`}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v15.125c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}
        
        {/* Back Button - Floating over backdrop */}
        <div className="absolute top-6 left-6">
          <Link
            href="/tvshows"
            className="inline-flex items-center px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors duration-200 backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to TV Shows
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
                  alt={`${tvShow.title} poster`}
                  width={256}
                  height={384}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800">
                  <svg className="w-16 h-16 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v15.125c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* TV Show Information */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {tvShow.title}
              </h1>
              {tvShow.originalTitle && tvShow.originalTitle !== tvShow.title && (
                <p className="text-lg text-gray-600 dark:text-gray-400 italic mb-2">
                  {tvShow.originalTitle}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                  {tvShow.originalLanguage.toUpperCase()}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {tvShow.seasons?.length || 0} season{(tvShow.seasons?.length || 0) !== 1 ? 's' : ''}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {totalEpisodes} episode{totalEpisodes !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Rating */}
            {tvShow.voteAverage > 0 && (
              <div className="flex items-center mb-6">
                <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                  <svg className="w-5 h-5 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-semibold text-yellow-900 dark:text-yellow-100">
                    {tvShow.voteAverage.toFixed(1)}/10
                  </span>
                  {tvShow.voteCount > 0 && (
                    <span className="ml-2 text-sm text-yellow-700 dark:text-yellow-300">
                      ({tvShow.voteCount.toLocaleString()} votes)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Genres */}
            {tvShow.genres && tvShow.genres.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Genres
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tvShow.genres.map((genre) => (
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
            {tvShow.overview && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Overview
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                  {tvShow.overview}
                </p>
              </div>
            )}

            {/* Cast */}
            {tvShow.cast && tvShow.cast.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Cast
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {tvShow.cast
                    .sort((a, b) => a.order - b.order) // Sort by cast order
                    .slice(0, 20) // Limit to first 20 cast members to avoid overwhelming the UI
                    .map((castMember) => (
                      <CastMemberCard key={`${castMember.id}-${castMember.order}`} castMember={castMember} />
                    ))}
                </div>
                {tvShow.cast.length > 20 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Showing 20 of {tvShow.cast.length} cast members
                  </p>
                )}
              </div>
            )}

            {/* Crew */}
            {tvShow.crew && tvShow.crew.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Crew
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {tvShow.crew
                    .sort((a, b) => {
                      // Sort by importance (Creator, Executive Producer, etc. first)
                      const importantJobs = ['Creator', 'Executive Producer', 'Producer', 'Writer', 'Director'];
                      const aIndex = importantJobs.indexOf(a.job);
                      const bIndex = importantJobs.indexOf(b.job);
                      
                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                      if (aIndex !== -1) return -1;
                      if (bIndex !== -1) return 1;
                      
                      return a.name.localeCompare(b.name);
                    })
                    .slice(0, 20) // Limit to first 20 crew members to avoid overwhelming the UI
                    .map((crewMember) => (
                      <CrewMemberCard key={`${crewMember.id}-${crewMember.job}`} crewMember={crewMember} />
                    ))}
                </div>
                {tvShow.crew.length > 20 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Showing 20 of {tvShow.crew.length} crew members
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
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">TMDB ID:</span>
                  <span className="text-gray-900 dark:text-gray-100">{tvShow.tmdbId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">Language:</span>
                  <span className="text-gray-900 dark:text-gray-100">{tvShow.originalLanguage.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">Total Seasons:</span>
                  <span className="text-gray-900 dark:text-gray-100">{tvShow.seasons?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600 dark:text-gray-400">Total Episodes:</span>
                  <span className="text-gray-900 dark:text-gray-100">{totalEpisodes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seasons Section */}
        {tvShow.seasons && tvShow.seasons.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Seasons & Episodes
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={expandAllSeasons}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAllSeasons}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors duration-200"
                >
                  Collapse All
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {tvShow.seasons
                .sort((a, b) => a.seasonNumber - b.seasonNumber)
                .map((season) => (
                  <SeasonCard
                    key={season.seasonNumber}
                    season={season}
                    isExpanded={expandedSeasons.has(season.seasonNumber)}
                    onToggle={() => toggleSeason(season.seasonNumber)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
