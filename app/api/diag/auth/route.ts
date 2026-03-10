import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function redactUrl(input: string): string {
  try {
    const url = new URL(input);
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return input;
  }
}

export async function GET(req: Request) {
  const nextAuthUrl = process.env.NEXTAUTH_URL || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const origin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return '';
    }
  })();

  return NextResponse.json(
    {
      nodeEnv: process.env.NODE_ENV,
      origin,
      nextAuthUrl: nextAuthUrl ? redactUrl(nextAuthUrl) : null,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,

      api: {
        url: apiUrl ? redactUrl(apiUrl) : null,
        loginEndpoint: apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/v1/auth/login` : null,
        profileEndpoint: apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/v1/users/profile` : null,
      },

      featureFlags: {
        authDisabled: process.env.NEXT_PUBLIC_AUTH_DISABLED ?? null,
        productsLocal: process.env.NEXT_PUBLIC_PRODUCTS_LOCAL ?? null,
        quotesLocal: process.env.NEXT_PUBLIC_QUOTES_LOCAL ?? null,
      },
    },
    { status: 200 }
  );
}
