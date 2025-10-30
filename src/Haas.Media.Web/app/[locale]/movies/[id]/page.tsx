import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MovieDetails } from "@/features/media/components";
import { Spinner } from "@/components/ui";

interface MoviePageProps {
  params: {
    id: number;
  };
}

export default function MoviePage({ params }: MoviePageProps) {
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
      <MovieDetails movieId={params.id} />
    </Suspense>
  );
}
