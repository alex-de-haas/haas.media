"use client";

import { Suspense } from "react";
import { DigitalReleaseCalendar } from "@/features/media/components";
import { usePageTitle } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui";

export default function DigitalReleasesPage() {
  usePageTitle("Digital Releases");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        }
      >
        <DigitalReleaseCalendar />
      </Suspense>
    </main>
  );
}
