export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">404</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">The page you are looking for could not be found.</p>
      <a
        href="/"
        className="mt-4 inline-block px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Back to Home
      </a>
    </div>
  );
}
