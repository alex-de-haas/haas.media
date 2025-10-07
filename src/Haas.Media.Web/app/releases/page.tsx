"use client";

import { Suspense } from "react";
import { ReleaseCalendar } from "@/features/media/components";
import { usePageTitle } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui";

export default function DigitalReleasesPage() {
  usePageTitle("Releases Calendar");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Spinner className="size-8" />
            </CardContent>
          </Card>
        }
      >
        <ReleaseCalendar />
      </Suspense>
    </main>
  );
}
