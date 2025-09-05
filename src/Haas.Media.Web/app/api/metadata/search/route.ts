import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getApiDownloaderUrl } from '@/lib/env';

export const GET = withApiAuthRequired(async function handler(req: NextRequest) {
  try {
    const { accessToken } = await getAccessToken();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const libraryType = searchParams.get('libraryType');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    const url = new URL(`${getApiDownloaderUrl()}/api/metadata/search`);
    url.searchParams.set('query', query);
    if (libraryType) {
      url.searchParams.set('libraryType', libraryType);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Search failed' },
        { status: response.status }
      );
    }

    const searchResults = await response.json();
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
