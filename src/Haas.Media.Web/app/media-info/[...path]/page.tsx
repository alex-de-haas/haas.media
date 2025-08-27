"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";

interface PageProps {
  params: { path: string };
}

export default function MediaInfoPage({ params }: PageProps) {
  const { path } = params;
  const router = useRouter();
  
  // Join path segments and decode the full path
  const decodedPath = React.useMemo(() => {
    if (!path || path.length === 0) return '';
    return decodeURIComponent(path);
  }, [path]);
  
  const { mediaFiles, loading, error } = useMediaFiles(decodedPath);
  const [selectedStreams, setSelectedStreams] = React.useState<Record<string, Set<number>>>({});
  const { encodeAll, encoding, encodeError } = useEncodeStreams(decodedPath, mediaFiles, selectedStreams);

  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

  const handleEncodeAndRedirect = React.useCallback(async () => {
    try {
      await encodeAll();
      // Redirect to encodings page after successful encoding start
      router.push('/encodings');
    } catch (error) {
      // Error is already handled by the hook, just stay on current page
      console.error('Encoding failed:', error);
    }
  }, [encodeAll, router]);

  if (!decodedPath) return <div className="p-6">No file path provided.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold mb-1">Media File Info</h1>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Path: <span className="font-mono">{decodedPath}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Selected streams: {Object.values(selectedStreams).reduce((acc, s) => acc + (s?.size ?? 0), 0)}
          </div>
          <button 
            type="button" 
            disabled={encoding || !hasAnySelection} 
            onClick={handleEncodeAndRedirect} 
            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {encoding ? "Encoding..." : "Encode Selected"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
            <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="sr-only">Loading...</span>
            <span>Loading media files…</span>
          </div>
        </div>
      )}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {encodeError && <div className="text-red-500 text-sm">{encodeError}</div>}

      {mediaFiles && (
        <MediaFilesList 
          mediaFiles={mediaFiles} 
          selectedStreams={selectedStreams} 
          setSelectedStreams={setSelectedStreams} 
          encoding={encoding} 
        />
      )}
    </div>
  );
}
