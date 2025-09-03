import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getApiDownloaderUrl } from '@/lib/env';

export const GET = withApiAuthRequired(async function handler(req: NextRequest) {
  try {
    const { accessToken } = await getAccessToken();
    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get('libraryId');
    
    const url = new URL(`${getApiDownloaderUrl()}/api/metadata/movies`);
    if (libraryId) {
      url.searchParams.set('libraryId', libraryId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch movies' },
        { status: response.status }
      );
    }

    const movies = await response.json();
    return NextResponse.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
