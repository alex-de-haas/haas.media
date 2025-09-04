import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MovieDetails } from '@/features/media/components';
import { LoadingSpinner } from '@/components/ui';

interface MoviePageProps {
  params: {
    id: string;
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
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <MovieDetails movieId={params.id} />
    </Suspense>
  );
}
