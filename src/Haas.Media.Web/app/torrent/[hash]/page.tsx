"use client";

import React from "react";
import { useMediaFiles, useEncodeStreams } from "@/features/media";
import { MediaFilesList } from "@/features/media";

interface PageProps {
  params: { hash: string };
}

export default function TorrentMediaInfoPage({ params }: PageProps) {
  const { hash } = params;
  const { mediaFiles, loading, error } = useMediaFiles(hash);
  const [selectedStreams, setSelectedStreams] = React.useState<Record<string, Set<number>>>({});
  const { encodeAll, encoding, encodeError } = useEncodeStreams(hash, mediaFiles, selectedStreams);

  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

  // encoding, encodeError and encodeAll are provided by useEncodeStreams

  if (!hash) return <div className="p-6">No hash provided.</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold mb-1">Torrent Media Files</h1>
          <div className="text-xs text-gray-600 dark:text-gray-400">Hash: <span className="font-mono">{hash}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-600 dark:text-gray-400">Selected streams: {Object.values(selectedStreams).reduce((acc, s) => acc + (s?.size ?? 0), 0)}</div>
          <button type="button" disabled={encoding || !hasAnySelection} onClick={() => void encodeAll()} className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {encoding ? "Encoding..." : "Encode Selected"}
          </button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {encodeError && <div className="text-red-500 text-sm">{encodeError}</div>}

      {mediaFiles && (
        <MediaFilesList mediaFiles={mediaFiles} selectedStreams={selectedStreams} setSelectedStreams={setSelectedStreams} encoding={encoding} />
      )}
    </div>
  );
}
