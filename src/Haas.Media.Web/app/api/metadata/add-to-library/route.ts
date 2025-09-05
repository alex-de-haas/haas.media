import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getApiDownloaderUrl } from '@/lib/env';

export const POST = withApiAuthRequired(async function handler(req: NextRequest) {
  try {
    const { accessToken } = await getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const response = await fetch(`${getApiDownloaderUrl()}/api/metadata/add-to-library`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseData = await response.json();

    if (response.status === 400) {
      return NextResponse.json(
        { error: responseData.message || 'Bad request' },
        { status: 400 }
      );
    }

    if (response.status === 409) {
      return NextResponse.json(
        { error: responseData.message || 'Item already exists in library' },
        { status: 409 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: responseData.message || 'Failed to add to library' },
        { status: response.status }
      );
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error adding to library:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
