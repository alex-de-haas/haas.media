export default function RootLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
        <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <span className="sr-only">Loading...</span>
        <p>Loading content…</p>
      </div>
    </div>
  );
}
