"use client";

import Link from "next/link";
import { ArrowRight, Library, Folder } from "lucide-react";

import { usePageTitle } from "@/components/layout";
import { useAuthGuard } from "@/features/auth/use-auth-guard";
import { EncodingDashboardWidget } from "@/components/encoding";
import { TorrentDashboardWidget } from "@/components/torrent";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "Media Libraries",
    description: "Inspect and organize every collection in your library.",
    href: "/libraries",
    icon: Library,
    cta: "Browse libraries",
  },
  {
    title: "File Explorer",
    description: "Review raw files, storage usage, and transfer history.",
    href: "/files",
    icon: Folder,
    cta: "Open file view",
  },
];

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthGuard();

  usePageTitle("Dashboard");

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-2">
        <EncodingDashboardWidget />
        <TorrentDashboardWidget />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {quickActions.map(({ title, description, href, icon: Icon, cta }) => (
          <Card key={title} className="flex h-full flex-col justify-between border-muted">
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-xl">{title}</CardTitle>
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" asChild>
                <Link href={href}>
                  {cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}
