"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { PeopleList } from "@/features/media/components";
import { Spinner } from "@/components/ui";
import { usePageTitle } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";

export default function PeoplePage() {
  const t = useTranslations("people");

  usePageTitle(t("title"));

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
        <PeopleList />
      </Suspense>
    </main>
  );
}
