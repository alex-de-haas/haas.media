import type { Metadata } from "next";
import Script from "next/script";
import Header from "../components/layout/header";
import "./globals.css";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { NotificationsProvider } from "../lib/notifications";

export const metadata: Metadata = {
  title: "Haas Media Server",
  description: "A modern media server for downloading and managing content",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const theme = stored || 'system';
                  const media = window.matchMedia('(prefers-color-scheme: dark)');
                  const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
                  const root = document.documentElement;
                  root.classList.remove('light', 'dark');
                  root.classList.add(resolved);
                  root.style.colorScheme = resolved;
                } catch (e) {
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white text-gray-900 antialiased transition-colors duration-0 dark:bg-gray-950 dark:text-gray-100">
        <UserProvider>
          <NotificationsProvider>
            <Header />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </NotificationsProvider>
        </UserProvider>
      </body>
    </html>
  );
}
