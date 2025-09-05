"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { SearchResult } from "@/types/metadata";
import { Library, LibraryType } from "@/types/library";
import { metadataApi } from "@/lib/api/metadata";
import { useLibraries } from "@/features/libraries/hooks/useLibraries";
import { getPosterUrl } from "@/lib/tmdb";
import { LoadingSpinner } from "@/components/ui";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: LibraryType;
  title: string;
}

export default function SearchModal({ isOpen, onClose, mediaType, title }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { libraries } = useLibraries();

  // Filter libraries by media type
  const filteredLibraries = useMemo(() => {
    return libraries.filter(library => library.type === mediaType);
  }, [libraries, mediaType]);

  // Set default library if only one exists
  useEffect(() => {
    if (filteredLibraries.length === 1 && !selectedLibraryId) {
      const firstLibrary = filteredLibraries[0];
      if (firstLibrary?.id) {
        setSelectedLibraryId(firstLibrary.id);
      }
    }
  }, [filteredLibraries, selectedLibraryId]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
      return () => document.removeEventListener("keydown", handleEscKey);
    }
    
    return () => {}; // Return empty cleanup function for when not open
  }, [isOpen, onClose]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    try {
      const results = await metadataApi.search(searchQuery, mediaType);
      setSearchResults(results.filter(result => result.type === mediaType));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToLibrary = async (result: SearchResult) => {
    if (!selectedLibraryId) {
      setError("Please select a library");
      return;
    }

    setIsAdding(result.tmdbId.toString());
    setError(null);
    try {
      await metadataApi.addToLibrary({
        type: mediaType,
        libraryId: selectedLibraryId,
        tmdbId: result.tmdbId.toString(),
      });
      
      // Close modal on success
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to library");
    } finally {
      setIsAdding(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden dark:bg-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Library Selection */}
          {filteredLibraries.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Library
              </label>
              <select
                value={selectedLibraryId}
                onChange={(e) => setSelectedLibraryId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Select a library</option>
                {filteredLibraries.map((library) => (
                  <option key={library.id} value={library.id}>
                    {library.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Search for ${mediaType === LibraryType.Movies ? 'movies' : 'TV shows'}...`}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <LoadingSpinner size="sm" />
              ) : (
                "Search"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchResults.length === 0 && !isSearching ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? "No results found" : "Search for content to add to your library"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((result) => (
                <div
                  key={result.tmdbId}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  {/* Poster */}
                  <div className="flex-shrink-0">
                    {result.posterPath ? (
                      <Image
                        src={getPosterUrl(result.posterPath) || ''}
                        alt={result.title}
                        width={80}
                        height={120}
                        className="rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-20 h-30 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {result.title}
                    </h4>
                    {result.originalTitle !== result.title && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.originalTitle}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{result.voteAverage.toFixed(1)}</span>
                      </div>
                      <span>({result.voteCount} votes)</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                      {result.overview}
                    </p>
                  </div>

                  {/* Add Button */}
                  <div className="flex-shrink-0 flex items-center">
                    <button
                      onClick={() => handleAddToLibrary(result)}
                      disabled={!selectedLibraryId || isAdding === result.tmdbId.toString()}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAdding === result.tmdbId.toString() ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        "Add to Library"
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
