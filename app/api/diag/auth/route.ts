import { NextResponse } from 'next/server';
import fs from 'node:fs';

export const runtime = 'nodejs';

function isDockerRuntime(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function getEffectiveKeycloakIssuer(): string {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const issuerInternal = process.env.KEYCLOAK_ISSUER_INTERNAL;
  return isDockerRuntime()
    ? (issuerInternal && issuerInternal.trim()) || (issuer && issuer.trim()) || ''
    : (issuer && issuer.trim()) || (issuerInternal && issuerInternal.trim()) || '';
}

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
  const keycloakIssuer =
    (process.env.KEYCLOAK_ISSUER_INTERNAL && process.env.KEYCLOAK_ISSUER_INTERNAL.trim()) ||
    (process.env.KEYCLOAK_ISSUER && process.env.KEYCLOAK_ISSUER.trim()) ||
    '';
  const effectiveIssuer = getEffectiveKeycloakIssuer();

  const origin = (() => {
    try {
      return new URL(req.url).origin;
    } catch {
      return '';
    }
  })();

  const effectiveBaseUrl = nextAuthUrl || origin;
  const callbackUrl = effectiveBaseUrl
    ? `${effectiveBaseUrl.replace(/\/$/, '')}/api/auth/callback/keycloak`
    : null;

  const wellKnownUrl = keycloakIssuer
    ? `${keycloakIssuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    : null;

  const effectiveWellKnownUrl = effectiveIssuer
    ? `${effectiveIssuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    : null;

  let wellKnown: {
    ok: boolean;
    status?: number;
    error?: string;
  } | null = null;

  if (effectiveWellKnownUrl) {
    try {
      const res = await fetch(effectiveWellKnownUrl, { cache: 'no-store' });
      wellKnown = { ok: res.ok, status: res.status };
    } catch (e) {
      wellKnown = {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(
    {
      nodeEnv: process.env.NODE_ENV,
      origin,
      nextAuthUrl: nextAuthUrl ? redactUrl(nextAuthUrl) : null,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,

      keycloak: {
        hasIssuer: !!keycloakIssuer,
        issuer: keycloakIssuer ? redactUrl(keycloakIssuer) : null,
        effectiveIssuer: effectiveIssuer ? redactUrl(effectiveIssuer) : null,
        dockerRuntime: isDockerRuntime(),
        hasClientId: !!process.env.KEYCLOAK_CLIENT_ID,
        hasClientSecret: !!process.env.KEYCLOAK_CLIENT_SECRET,
      },

      computed: {
        callbackUrl,
        wellKnownUrl: effectiveWellKnownUrl ? redactUrl(effectiveWellKnownUrl) : null,
        wellKnown,
      },
    },
    { status: 200 }
  );
}
