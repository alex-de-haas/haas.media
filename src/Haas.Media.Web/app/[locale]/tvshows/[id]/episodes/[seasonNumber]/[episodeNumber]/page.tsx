import { Suspense } from "react";
import { notFound } from "next/navigation";
import { EpisodeDetails } from "@/features/media/components";
import { Spinner } from "@/components/ui";

interface EpisodePageProps {
  params: {
    id: string;
    seasonNumber: string;
    episodeNumber: string;
  };
}

export default function EpisodePage({ params }: EpisodePageProps) {
  const tvShowId = parseInt(params.id, 10);
  const seasonNumber = parseInt(params.seasonNumber, 10);
  const episodeNumber = parseInt(params.episodeNumber, 10);

  if (isNaN(tvShowId) || isNaN(seasonNumber) || isNaN(episodeNumber)) {
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
      <EpisodeDetails tvShowId={tvShowId} seasonNumber={seasonNumber} episodeNumber={episodeNumber} />
    </Suspense>
  );
}
