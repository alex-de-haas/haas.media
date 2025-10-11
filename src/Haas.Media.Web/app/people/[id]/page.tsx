import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PersonDetails } from "@/features/media/components";
import { Spinner } from "@/components/ui";

interface PersonPageProps {
  params: {
    id: number;
  };
}

export default function PersonPage({ params }: PersonPageProps) {
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
      <PersonDetails personId={params.id} />
    </Suspense>
  );
}
