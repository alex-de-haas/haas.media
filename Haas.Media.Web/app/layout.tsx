import type { Metadata } from "next";
import Script from "next/script";
import ClientLayout from "../components/layout/client-layout";
import Header from "../components/layout/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haas Media Server",
  description: "A modern media server for downloading and managing content",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const theme = stored || 'system';
                  const media = window.matchMedia('(prefers-color-scheme: dark)');
                  const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(resolved);
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <ClientLayout>
          <Header />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </ClientLayout>
      </body>
    </html>
  );
}
