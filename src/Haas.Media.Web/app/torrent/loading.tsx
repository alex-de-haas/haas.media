export default function TorrentLoading() {
  return (
    <div className="py-24 flex flex-col items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <div className="animate-pulse h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      <p>Loading torrents…</p>
    </div>
  );
}
