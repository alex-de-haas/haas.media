"use client";

import { useEffect, useState } from "react";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={`min-h-screen ${mounted ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      {children}
    </div>
  );
}
