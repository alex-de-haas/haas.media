import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TVShowDetails } from "@/features/media/components";
import { Spinner } from "@/components/ui";

interface TVShowPageProps {
  params: {
    id: string;
  };
}

export default function TVShowPage({ params }: TVShowPageProps) {
  if (!params.id) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-8" />
        </div>
      }
    >
      <TVShowDetails tvShowId={params.id} />
    </Suspense>
  );
}
