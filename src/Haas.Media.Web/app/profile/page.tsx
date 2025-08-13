"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data?.user ?? null);
        }
      } catch {}
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      {user ? (
        <pre className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}
