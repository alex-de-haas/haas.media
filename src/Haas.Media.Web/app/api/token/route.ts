import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

export const GET = withApiAuthRequired(async () => {
  try {
    const { accessToken } = await getAccessToken();
    return NextResponse.json({ accessToken });
  } catch (e) {
    return NextResponse.json({ error: 'Unable to fetch access token' }, { status: 500 });
  }
});
