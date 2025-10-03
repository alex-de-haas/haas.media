import type { Metadata } from "next";
import ClientLayout from "../components/layout/client-layout";
import "./globals.css";
import { PublicEnvScript } from "next-runtime-env";

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
        <PublicEnvScript />
      </head>
      <body className="min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
