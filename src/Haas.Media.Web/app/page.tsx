"use client";

import Link from "next/link";
import { ArrowRight, CloudDownload, Cpu, Library, Folder, BadgeCheck } from "lucide-react";

import { usePageTitle } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "Manage Torrents",
    description: "Upload new .torrent files and control active downloads.",
    href: "/torrent",
    icon: CloudDownload,
    cta: "Open torrents",
  },
  {
    title: "Encoding Queue",
    description: "Monitor encoding jobs and keep formats consistent across devices.",
    href: "/encodings",
    icon: Cpu,
    cta: "View encodings",
  },
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
  usePageTitle("Dashboard");

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
          <CardHeader className="gap-4">
            <Badge variant="secondary" className="w-fit rounded-full">
              Always-on automation
            </Badge>
            <CardTitle className="text-3xl font-semibold tracking-tight sm:text-4xl">Your personal media control center</CardTitle>
            <CardDescription>
              Keep downloads flowing, transcode media to the perfect format, and surface fresh content for every screen—without leaving this
              dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CloudDownload className="h-4 w-4" />
                Torrent pipeline
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Drop torrents to schedule prioritized downloads and throttled seeding.</p>
              <Badge variant="outline" className="mt-3">
                Ready
              </Badge>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Cpu className="h-4 w-4" />
                Encoding jobs
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Automate transcodes with device-aware presets and smart retries.</p>
              <Badge variant="outline" className="mt-3">
                Standing by
              </Badge>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Library className="h-4 w-4" />
                Library health
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Surface metadata gaps, duplicate titles, and ready-to-watch highlights.</p>
              <Badge variant="outline" className="mt-3">
                Insights enabled
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <BadgeCheck className="h-10 w-10 text-primary" />
            <CardTitle className="text-2xl">System status</CardTitle>
            <CardDescription>Background services are healthy. Connect additional providers to unlock richer automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• SignalR notifications are ready for live progress updates.</p>
            <p>• Web encoders are idling—kick off a job to warm the queue.</p>
            <p>• Library syncing runs every 30 minutes for fresh metadata.</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="px-0" asChild>
              <Link href="/libraries">
                Review libraries
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
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
