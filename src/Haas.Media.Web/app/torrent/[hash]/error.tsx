"use client";
import { useEffect } from "react";

export default function TorrentHashError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("[torrent hash] error", error); }, [error]);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-lg font-semibold">Failed to load media info</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{error.message || "An unexpected error occurred."}</p>
      <button onClick={() => reset()} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Retry</button>
    </div>
  );
}
