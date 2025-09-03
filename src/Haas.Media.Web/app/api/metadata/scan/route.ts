import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { getApiDownloaderUrl } from '@/lib/env';

export const POST = withApiAuthRequired(async function handler(req: NextRequest) {
  try {
    const { accessToken } = await getAccessToken();

    const response = await fetch(`${getApiDownloaderUrl()}/api/metadata/scan`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to scan libraries' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error scanning libraries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
