import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@auth0/nextjs-auth0';
import { getApiDownloaderUrl } from '@/lib/env';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { accessToken } = await getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;

    const response = await fetch(`${getApiDownloaderUrl()}/api/metadata/movies/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch movie' },
        { status: response.status }
      );
    }

    const movie = await response.json();
    return NextResponse.json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
