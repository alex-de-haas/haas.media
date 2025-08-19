"use client";
import { useEffect } from "react";

export default function TorrentError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("[torrent] route error", error); }, [error]);
  return (
    <div className="py-24 flex flex-col items-center gap-4 text-center">
      <h1 className="text-xl font-semibold">Failed to load torrents</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">{error.message || "An unexpected error occurred."}</p>
      <button onClick={() => reset()} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Retry</button>
    </div>
  );
}
