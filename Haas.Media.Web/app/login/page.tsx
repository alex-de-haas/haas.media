export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-gray-600 dark:text-gray-300">Use Auth0 to sign in to Haas Media Server.</p>
        <a href="/api/auth/login" className="inline-block px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Continue with Auth0
        </a>
      </div>
    </div>
  );
}
